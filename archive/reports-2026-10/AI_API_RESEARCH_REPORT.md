# AI API 研究报告

## 项目现状分析

### 当前集成的 Provider

项目已在 `/src/lib/ai/` 实现了完整的多模型路由系统：

| Provider | 状态 | 用途 |
|----------|------|------|
| **minimax** | ✅ 主力 | 对话、代码生成、分析 |
| **volcengine** | ⚠️ 401错误 | 多模态 (图像/音频) |
| **openai** | ✅ 已集成 | GPT-4.5/4o |
| **anthropic** | ✅ 已集成 | Claude 4 |
| **google** | ✅ 已集成 | Gemini 2 |
| **deepseek** | ✅ 已集成 | Coder/Chat |
| **zhipu** | ✅ 已集成 | GLM-4 |
| **bailian** | ✅ 已集成 | Agent CLI |
| **self-claude** | ✅ 已集成 | 自托管 Claude |

### 问题诊断

**volcengine/deepseek-v3 401 错误原因：**
1. API Key 可能过期或无效
2. 账号可能欠费
3. 端点 URL 可能不正确
4. 鉴权方式变更

---

## 推荐的新 API 提供商

### 1. 硅基流动 (SiliconFlow) - ⭐ 强烈推荐

**优势：**
- 一站式聚合 API，兼容 OpenAI 格式
- 支持数十种模型，包括 DeepSeek、Qwen、GLM 等
- 国内访问速度快，价格便宜
- 免费额度：¥10

**支持的模型：**
- DeepSeek V2/Chat
- Qwen 1.5/2.0 系列
- GLM-4/4V
- Llama 3
- Yi 系列

**定价（参考）：**
- DeepSeek Chat: ¥1/1M tokens (输入) / ¥2/1M tokens (输出)
- Qwen 72B: ¥6/1M tokens (输入)

**集成示例：**
```typescript
// 使用 OpenAI 兼容格式
const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'deepseek-ai/DeepSeek-V2-Chat',
    messages: [{ role: 'user', content: 'Hello' }]
  })
})
```

---

### 2. 阿里云百炼 (DashScope) - 推荐

**优势：**
- 阿里官方服务，稳定可靠
- Qwen 系列模型性能优秀
- 支持长上下文 (128K+)

**支持的模型：**
- Qwen 2.5 (最新)
- Qwen 1.5
- LLaMA 3

**定价：**
- Qwen 2.5 72B: ¥6/1M tokens (输入)
- Qwen 2.5 7B: ¥0.5/1M tokens

---

### 3. 字节跳动豆包 (ByteDance) - 可选

**优势：**
- 字节跳动官方
- 价格极低
- 国内速度快

**定价：**
- Doubao-pro-32k: ¥1/1M tokens

---

### 4. Moonshot (月之暗面) - 可选

**优势：**
- Kimi 模型，长文本处理能力强
- 支持 128K 上下文

**定价：**
- Kimi k0: ¥15/1M tokens (输入)

---

## 替代方案对比

| Provider | 价格 | 速度 | 稳定性 | 文档 | 推荐度 |
|----------|------|------|--------|------|--------|
| 硅基流动 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 阿里云百炼 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 字节豆包 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Moonshot | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |

---

## 集成步骤

### 步骤 1：添加环境变量

在 `.env.production` 中添加：

```bash
# 硅基流动
SILICONFLOW_API_KEY=sk-xxxxx

# 阿里云百炼
DASHSCOPE_API_KEY=sk-xxxxx

# 字节豆包
BYTEDANCE_API_KEY=xxxxx
```

### 步骤 2：创建 Provider 类

参考现有结构创建 `SiliconFlowProvider.ts`：

```typescript
// /src/lib/ai/providers/SiliconFlowProvider.ts
export class SiliconFlowProvider extends BaseProvider {
  private baseURL = 'https://api.siliconflow.cn/v1'
  
  async generate(request: RouteRequest): Promise<AIResponse> {
    // 实现...
  }
}
```

### 步骤 3：注册到 ProviderFactory

```typescript
// /src/lib/ai/providers/index.ts
case 'siliconflow':
  provider = new SiliconFlowProvider(model, config)
  break
```

### 步骤 4：更新模型配置

在 `models.ts` 中添加新模型：

```typescript
{
  id: 'silicon-deepseek-v2',
  name: 'DeepSeek V2 (SF)',
  provider: AIModelProvider.SILICONFLOW,
  model: 'deepseek-ai/DeepSeek-V2-Chat',
  inputPricePerM: 1.0,
  outputPricePerM: 2.0,
  // ...
}
```

---

## 成本影响预估

### 当前使用情况（假设）

- 每日请求: 1000 次
- 平均输入: 2000 tokens
- 平均输出: 500 tokens

### 月度成本对比

| Provider | 估算月成本 (¥) |
|----------|---------------|
| MiniMax (当前) | ~300-500 |
| 硅基流动 | ~100-200 |
| 阿里云百炼 | ~200-400 |

---

## 修复 volcengine 401 错误的建议

1. **检查 API Key**
   ```bash
   # 测试 volcengine key 是否有效
   curl -X GET "https://open.volcengineapi.com/v1/chat/completions" \
     -H "Authorization: Bearer $VOLCENGINE_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"deepseek-v3","messages":[{"role":"user","content":"test"}]}'
   ```

2. **可能的问题**
   - API Key 已过期
   - 账号余额不足
   - 需要开通特定模型权限

3. **建议**
   - 优先使用硅基流动作为备选
   - 考虑使用 SiliconFlow 替代 DeepSeek（同样的模型，更低的价格）

---

## 结论

1. **最佳选择：硅基流动 (SiliconFlow)**
   - 聚合多模型，价格低，兼容 OpenAI 格式
   - 可直接替换 volcengine/deepseek-v3

2. **备选：阿里云百炼**
   - 官方服务，稳定可靠

3. **下一步行动**
   - 申请硅基流动免费额度
   - 创建 SiliconFlowProvider
   - 测试集成
