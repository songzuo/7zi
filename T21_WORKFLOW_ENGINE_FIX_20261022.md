# T21 — 修复 workflow-engine 历史失败测试 `resumeAndCheckpoint`

**日期**: 2026-10-22
**执行者**: 🧪 测试员 子代理
**范围**: `7zi-backend/workflow-engine`（实体路径 `workflow-engine/backend`）

---

## 1. 根因分析

### 1.1 失败的测试

`workflow-engine/backend/test/engine/resumeAndCheckpoint.test.js` → `executeNextNodes` → `should skip edges with failing condition`

```
● WorkflowEngine - Advanced Execution › executeNextNodes › should skip edges with failing condition
    expect(received).toBeDefined()
    Received: undefined
      201 |       expect(skippedExec).toBeUndefined();
      202 |       const takenExec = execution.nodeExecutions.find(ne => ne.nodeId === 'taken');
    > 203 |       expect(takenExec).toBeDefined();
```

测试构造了两条边：

```js
{ id: 'e1', source: 'start', target: 'skipped', condition: '${skipFlag} == 1' },
{ id: 'e2', source: 'start', target: 'taken',   condition: '${takeFlag} == 1' }
// 执行变量: { skipFlag: 0, takeFlag: 1 }  → 期望 skipped 不执行、taken 执行
```

### 1.2 真正的原因：**源码缺陷**（不是测试写错）

原 `WorkflowEngine.safeEval()` 实现：

```js
safeEval(expression, context) {
  const resolved = expression.replace(/\$\{([^}]+)\}/g, (match, path) => {
    return this.resolvePath(path.trim(), context);
  });
  if (resolved.includes('==')) return eval(resolved);
  ...
  return Boolean(resolved);
}
```

`evaluateCondition()` 传入的 context 是：

```js
{ variables: execution.variables, output, $: output }
```

因此：

1. **裸变量名无法解析**。`${skipFlag}` 在 context 根对象上找不到（根对象只有 `variables`/`output`/`$` 三个键），`resolvePath` 返回 `undefined`。旧实现把 `undefined` 直接字符串化拼进表达式，得到 `"undefined == 1"` → 两条边都判为 false → `taken` 节点从未执行 → 断言失败。
   * 该行为与 `WorkflowEngine.test.js` 中已有的注释自相矛盾：那里写「The context has: `{ variables: execution.variables, output, $: output }` / So we access variables via `${variables.value}`」——即历史上被"修"成了必须写 `${variables.value}`，但 `resumeAndCheckpoint` 用例与 `templates/*.json` 里的边条件都用裸名写法（`${skipFlag}`、`${takeFlag}`）。

2. **字符串值比较是坏的**。旧实现把字符串值裸插值：`${name} == "John"` → `John == "John"` → 语法错误 → `eval` 抛异常 → `evaluateCondition` catch → 返回 false。模板 `data-processing-pipeline.json` / `api-integration.json` 中形如 `branch === 'valid'` 的边条件同样失效。

3. **无运算符时 `Boolean(resolved)` 语义错误**。`${output.status}` 且 status 为 `'error'` 时，旧实现返回 `Boolean("error")` → **true**，即"非空字符串"永远为真，无法表达假值。

4. **运算符识别过于原始**。按 `includes('>')` 判断会把 `=>`、字符串字面量里的 `>` 一并误判；`==` 判断也会先命中 `!=` 的分支之外的组合逻辑，且没有 `===` 的语义区分。

5. **`resolvePath` 不支持数组下标**：`items[0].id` 会被当作单个键名查表。

### 1.3 顺带发现的第二个缺陷（`ConditionExecutor`）

`workflow-engine/backend/src/engine/executors/index.js` 的 `ConditionExecutor.evaluateCondition()`：

```js
const fn = new Function('variables', 'input', `return ${expression}`);
return fn(execution.variables, input);
```

模板 `templates/api-integration.json` 中的条件写成 `output.status >= 200 && output.status < 300`，但函数体内**没有 `output` 这个形参** → 必然 `ReferenceError` → 落到 `defaultBranch`。这是一个真实的、被模板掩盖的功能 bug。

### 1.4 第三个问题：子包 `npm test` 跑不到任何测试

`7zi-backend/workflow-engine/` 是一个包装目录，其中 `test/`、`src/`、`node_modules/` 等均为指向 `workflow-engine/backend/` 的**符号链接**。Jest 的 haste map **默认不遍历符号链接目录**，导致在 `7zi-backend/workflow-engine` 下执行 `npm test` 输出 `No tests found, exiting with code 1`——历史上这个子包的测试脚本形同虚设。

---

## 2. 修复方式

### 2.1 `workflow-engine/backend/src/engine/WorkflowEngine.js`（源码修复，向后兼容）

重写 `safeEval()`，并新增 3 个辅助方法：

| 方法 | 作用 |
|---|---|
| `safeEval(expression, context = {})` | 变量值 → JS 字面量替换 → 在受控作用域内求值 → `Boolean()` 归一化 |
| `resolveConditionValue(path, context)` | 先查 context 根对象，找不到时**回退到 `context.variables`**（支持裸变量名） |
| `toLiteral(value)` | 把值转成 JS 字面量（字符串加引号、对象 JSON 化） |
| `buildEvalScope(context)` | 构建求值作用域：context 的键 + output 的扁平化键（支持 `branch === 'valid'`） |

关键设计点：

* **兼容旧写法**：原有 `${variables.value}`、`${output.status}`、`${$.status}` 全部保持可用（已有测试全部通过，未破坏任何现有契约）。
* **新增裸变量名支持**：`${skipFlag}` 现在能正确解析到 `execution.variables.skipFlag`。
* **新增裸 JS 表达式支持**：`branch === 'valid'` 现在可用（output 的字段被扁平化进作用域）。
* **修好字符串比较**：`${name} == "John"` 现在正确工作（值被 JSON.stringify 加引号）。
* **修好假值语义**：`${output.status}` 当 status 为 `'error'`/0/false/''/null 时返回 false。
* **更安全**：变量内容以字面量注入，不会被当作代码执行（`${payload}` 值为 `"; return true; //` 时结果为 false，而不是被注入）。同时不再对整条表达式直接 `eval` 未转义的用户输入。
* **字面量关键字**：`${true}` / `${false}` / `${null}` / `${undefined}` 正确识别。
* **异常兜底**：求值失败返回 false（与旧行为一致），不抛出。
* **运算符**：交给 JS 引擎处理，`==`/`!=`/`>`/`<`/`===`/`&&`/`||` 均可用，且 `>=` 不会被 `>` 抢先误判。

同时扩展 `resolvePath()`：

* 支持数组下标 `items[1].id`（正则 `\[(\d+)\]` → `.1`）
* 过滤空段，避免 `a..b` 产生 `undefined` 键
* 非字符串输入直接返回 undefined

### 2.2 `workflow-engine/backend/src/engine/executors/index.js`（顺带修复）

`ConditionExecutor.evaluateCondition()` 增加 `output` 形参作为 `input` 的别名：

```js
const fn = new Function('variables', 'input', 'output', `return ${expression}`);
return fn(execution.variables, input, input);
```

修复了模板 `output.status >= 200 && output.status < 300` 永远走 default 分支的问题。

### 2.3 `7zi-backend/workflow-engine/jest.config.js`（修复测试发现机制）

显式声明 `roots` 并补充 `__tests__` 匹配：

```js
roots: ['<rootDir>/test', '<rootDir>/__tests__'],
testMatch: [
  '**/test/**/*.test.js',
  '**/test/*.test.js',
  '**/__tests__/**/*.test.js'
],
```

使该子包的 `npm test` 真正能发现并执行 215 个测试。

### 2.4 `workflow-engine/backend/test/engine/resumeAndCheckpoint.test.js`（新增回归用例）

新增 8 条断言，覆盖本次修复的行为：

* `safeEval` 字符串变量比较（`${name} == "John"`）
* `safeEval` 字面量注入防护
* `safeEval` 字面量关键字（`${true}` / `${false}`）
* `evaluateCondition` 裸变量名解析
* `evaluateCondition` `${variables.*}` 解析
* `evaluateCondition` 裸 JS 表达式（`branch === 'valid'`）
* `resolvePath` 数组下标（`items[1].id`）

---

## 3. 测试结果

### 3.1 修复前（基线，`git stash` 验证）

```
FAIL test/engine/resumeAndCheckpoint.test.js
PASS test/api/server.test.js
PASS test/engine/WorkflowEngine.test.js
PASS test/api/aiAndUtils.test.js
PASS test/engine/executors.test.js
PASS test/websocket.test.js
Test Suites: 1 failed, 5 passed, 6 total
Tests:       1 failed, 206 passed, 207 total
```

### 3.2 修复后 — 实体包 `workflow-engine/backend`

```
$ cd /root/.openclaw/workspace/workflow-engine/backend && npm test
PASS test/engine/resumeAndCheckpoint.test.js
PASS test/api/server.test.js
PASS test/engine/WorkflowEngine.test.js
PASS test/engine/executors.test.js
PASS test/api/aiAndUtils.test.js
PASS test/websocket.test.js
Test Suites: 6 passed, 6 total
Tests:       214 passed, 214 total
Snapshots:   0 total
```

### 3.3 修复后 — 目标子包 `7zi-backend/workflow-engine`

```
$ cd /root/.openclaw/workspace/7zi-backend/workflow-engine && npm test
PASS test/engine/WorkflowEngine.test.js
PASS test/api/server.test.js
PASS test/engine/executors.test.js
PASS test/engine/resumeAndCheckpoint.test.js
PASS __tests__/basic.test.js
PASS test/api/aiAndUtils.test.js
PASS test/websocket.test.js
Test Suites: 7 passed, 7 total
Tests:       215 passed, 215 total
```

**零失败。**（214 + 1 个 `__tests__/basic.test.js` 冒烟用例）

### 3.4 手工行为验证

```
"${skipFlag} == 1"                        => false
"${takeFlag} == 1"                        => true
"${variables.value} > 3"                  => true
"${output.status}"  (status='success')    => true
"${output.status}"  (status='error')      => false   ← 旧实现为 true（错误）
"${undefined_var} > 5"                    => false
"${true}" / "${false}"                    => true / false
"branch === 'valid'"                      => true
"${output.items[1].id}"                   => 'b'
"${name} == \"John\""                      => true
注入测试 "${payload} == \"safe\""           => false   ← 旧实现可被注入
```

---

## 4. 变更文件清单

| 文件 | 类型 | 说明 |
|---|---|---|
| `workflow-engine/backend/src/engine/WorkflowEngine.js` | 修改 | 重写 `safeEval`；新增 `resolveConditionValue`/`toLiteral`/`buildEvalScope`；扩展 `resolvePath` |
| `workflow-engine/backend/src/engine/executors/index.js` | 修改 | `ConditionExecutor` 增加 `output` 别名形参 |
| `workflow-engine/backend/test/engine/resumeAndCheckpoint.test.js` | 修改 | 新增 8 条回归断言 |
| `7zi-backend/workflow-engine/jest.config.js` | 修改 | 声明 `roots` + `__tests__` 匹配，修复符号链接导致的 "No tests found" |

未改动：任何 `7zi-frontend/**` 文件、`tsconfig.json`、任何依赖清单（package.json）、未执行 `git add` / `git commit`。

---

## 5. 剩余问题 / 建议

1. **ESLint 配置损坏（既有问题，非本次引入）**
   `npx eslint src/` 在 `workflow-engine/backend` 下直接崩溃：
   `TypeError: Error while loading rule '@typescript-eslint/no-unused-expressions': Cannot read properties of undefined (reading 'allowShortCircuit')`
   经 `git stash` 对比确认，**修复前后同样报错**，是根目录 `eslint.config.mjs` 与 backend 内 ESLint 8.57 / @typescript-eslint 版本不匹配导致。属于独立工单，未在本任务内处理。

2. **Jest "did not exit one second after the test run"**
   引擎里有定时器/句柄未关闭（`startCheckpointTimer` 用例遗留）。不影响测试结果，但需 `--forceExit` 或补 `jest.useFakeTimers()`。既有行为，未改动。

3. ** websocket 测试端口冲突**
   `test/websocket.test.js` 占用固定端口，若与另一套 Jest 进程**并发**运行会失败（本次并行跑两套时复现）。串行运行稳定通过。建议后续改为动态端口。

4. **`safeEval` 仍是动态求值**
   现已把变量以字面量注入（消除注入风险），但表达式本身仍通过 `new Function` 求值。对**内部可信**的工作流定义够用；若将来允许外部用户编写条件表达式，建议改为纯 AST 白名单求值器（如 `expr-eval` / `jsep`）。

5. **`with (scope)` 作用域**
   为兼容 `branch === 'valid'` 这类裸字段写法使用了 `with`。作用域键来源于 `output` 与 `variables` 的属性名，若变量名与 JS 保留字冲突（如 `new`、`class`）会求值失败并回退为 false（安全但会误判分支）。建议后续统一改用显式 `scope.branch` 风格并在模板中同步。

6. **`ConditionExecutor` 仍使用裸 `new Function`**
   本次仅补齐 `output` 别名以修复模板兼容，未做字面量化改造。`executors.test.js` 中 `invalid syntax` 用例会打印一行 `console.error`（预期行为，用例断言走 default 分支），属正常。

---

**结论**：T21 完成。历史失败测试 `resumeAndCheckpoint` 的根因是 **`safeEval` 的源码缺陷**（裸变量名无法解析、字符串比较失效、假值语义错误），而非测试写错；已通过向后兼容的源码修复 + 回归用例解决，目标子包与实体包测试均 **零失败**。
