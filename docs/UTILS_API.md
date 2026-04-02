# Utils API 文档

**最后更新**: 2026-03-17
**版本**: v1.0.0
**文件位置**: `src/lib/utils.ts`

---

## 概述

`utils.ts` 提供了 50+ 个实用函数，涵盖缓存、深拷贝、防抖节流、DOM 操作、数据处理、设备检测等常见任务。所有函数都使用 TypeScript 编写，提供完整的类型安全和 JSDoc 文档。

---

## 快速开始

```typescript
// 导入特定函数
import { debounce, deepClone, generateId } from '@/lib/utils'

// 导入所有工具
import * as Utils from '@/lib/utils'
```

---

## 缓存

### LRUCache

LRU (Least Recently Used) 缓存类，支持 TTL 和大小限制。

```typescript
import { LRUCache } from '@/lib/utils'

const cache = new LRUCache<string>(100) // 最大 100 条

cache.set('key1', 'value1', 60000) // 60 秒 TTL
const value = cache.get('key1')

console.log(cache.size) // 当前缓存大小
cache.clear() // 清空所有缓存
```

### createCache

创建具有特定 TTL 的缓存实例。

```typescript
import { createCache } from '@/lib/utils'

const cache = createCache<string>(60000) // 1 分钟 TTL

cache.set('key', 'value')
const value = cache.get('key')

cache.delete('key')
cache.clear()
console.log(cache.size)
```

---

## 防抖与节流

### advancedDebounce

高级防抖，支持取消、立即执行和状态检查。

```typescript
import { advancedDebounce } from '@/lib/utils'

const search = advancedDebounce((query: string) => console.log('Searching:', query), 300)

search('hello')
search.cancel() // 取消待执行
search.flush() // 立即执行
if (search.pending()) {
  console.log('有待执行的搜索')
}
```

### advancedThrottle

高级节流，支持取消和状态检查。

```typescript
import { advancedThrottle } from '@/lib/utils'

const scroll = advancedThrottle((e: Event) => console.log('Scrolling'), 100)

scroll(new Event('scroll'))
scroll.cancel()
if (scroll.pending()) {
  console.log('有待执行的滚动')
}
```

### 向后兼容

```typescript
import { debounce, throttle } from '@/lib/utils'

// 简单版本（已废弃但可用）
const debounced = debounce(fn, 300)
const throttled = throttle(fn, 100)
```

---

## 数据操作

### deepClone

深拷贝对象，支持循环引用。

```typescript
import { deepClone } from '@/lib/utils'

const original = { a: 1, b: { c: 2 } }
const cloned = deepClone(original)

cloned.b.c = 3 // 不影响原始对象
```

### memoize

函数结果缓存，支持大小限制。

```typescript
import { memoize } from '@/lib/utils'

const expensive = memoize(
  (n: number) => {
    console.log('计算中...')
    return n * n
  },
  undefined,
  100 // 最大缓存 100 个结果
)
```

### 数组操作

```typescript
import { batch, shuffle, randomItem, unique, groupBy } from '@/lib/utils'

batch([1, 2, 3, 4, 5], 2) // [[1, 2], [3, 4], [5]]
shuffle([1, 2, 3]) // [3, 1, 2] (随机)
randomItem([1, 2, 3]) // 2 (随机)
unique([1, 2, 2, 3]) // [1, 2, 3]

groupBy(
  [
    { id: 1, type: 'a' },
    { id: 2, type: 'b' },
  ],
  item => item.type
)
// Map { 'a' => [{ id: 1 }], 'b' => [{ id: 2 }] }
```

### 对象操作

```typescript
import { pick, omit } from '@/lib/utils'

const obj = { a: 1, b: 2, c: 3 }

pick(obj, ['a', 'c']) // { a: 1, c: 3 }
omit(obj, ['b']) // { a: 1, c: 3 }
```

---

## 格式化

### formatFileSize

格式化文件大小。

```typescript
import { formatFileSize } from '@/lib/utils'

formatFileSize(1024) // "1.0 KB"
formatFileSize(1048576, 2) // "1.00 MB"
```

### formatNumber

格式化数字（千位分隔符）。

```typescript
import { formatNumber } from '@/lib/utils'

formatNumber(1000000) // "1,000,000"
formatNumber(1000000, '.') // "1.000.000"
```

### generateId

生成唯一 ID（UUID v4）。

```typescript
import { generateId } from '@/lib/utils'

generateId() // "550e8400-e29b-41d4-a716-446655440000"
generateId('user') // "user-550e8400-e29b-41d4-a716-446655440000"
```

---

## DOM 操作

### 元素查询

类型安全的元素查询函数。

```typescript
import { getElementById, querySelector, querySelectorAll } from '@/lib/utils'

const button = getElementById<HTMLButtonElement>('myButton')
const inputs = querySelectorAll<HTMLInputElement>('input.required')
const firstInput = querySelector<HTMLInputElement>('input.required')
```

### 视口和滚动

```typescript
import { isInViewport, scrollToElement, getViewportSize } from '@/lib/utils'

isInViewport(element, 20) // 检查是否在视口（偏移 20px）
scrollToElement(element, true) // 滚动到元素并居中
const { width, height } = getViewportSize()
```

### 事件处理

自动清理的事件监听器。

```typescript
import { addEventListener, debounceDOM, throttleDOM } from '@/lib/utils'

// 添加事件监听，返回清理函数
const cleanup = addEventListener(window, 'resize', (e: Event) => console.log('Resized'))

// 后续调用 cleanup() 移除监听
cleanup()

// DOM 事件专用防抖/节流
const handleResize = debounceDOM((e: Event) => {
  console.log('Resize handler')
}, 100)
```

### 观察器

Intersection Observer 和 Resize Observer 包装。

```typescript
import { observeIntersection, observeResize } from '@/lib/utils'

// Intersection Observer
const cleanup1 = observeIntersection(element, entries => console.log('Intersection:', entries), {
  threshold: 0.5,
})

// Resize Observer
const cleanup2 = observeResize(element, entries => console.log('Resize:', entries))
```

### 剪贴板

```typescript
import { copyToClipboard, readFromClipboard } from '@/lib/utils'

await copyToClipboard('Hello, world!')
const text = await readFromClipboard()
```

### URL 和导航

```typescript
import { getQueryParams, updateQueryParams, downloadFile } from '@/lib/utils'

getQueryParams() // { search: "hello", page: "1" }

updateQueryParams({ search: 'hello', page: 2 })
downloadFile('https://example.com/file.pdf', 'document.pdf')
```

### 样式和类名

```typescript
import {
  addClassWithDelay,
  toggleClass,
  hasAllClasses,
  hasAnyClass,
  getComputedStyleValue,
} from '@/lib/utils'

addClassWithDelay(element, 'active', 100)
toggleClass(element, 'active', true) // 强制添加
hasAllClasses(element, ['active', 'visible']) // boolean
hasAnyClass(element, ['active', 'disabled']) // boolean
getComputedStyleValue(element, 'color') // "rgb(255, 255, 255)"
```

---

## 环境检测

### 平台检测

```typescript
import { isClient, isServer, isBrowser, isNode } from '@/lib/utils'

isClient() // 是否在客户端
isServer() // 是否在服务端
isBrowser() // 是否在浏览器
isNode() // 是否在 Node.js
```

### 设备检测

```typescript
import {
  prefersReducedMotion,
  prefersDarkMode,
  prefersLightMode,
  isTouchDevice,
  getDeviceType,
} from '@/lib/utils'

prefersReducedMotion() // 是否偏好减少动画
prefersDarkMode() // 是否偏好深色模式
prefersLightMode() // 是否偏好浅色模式
isTouchDevice() // 是否触摸设备
getDeviceType() // 'desktop' | 'tablet' | 'mobile'
```

---

## 数值计算

```typescript
import { clamp, mapRange, lerp } from '@/lib/utils'

clamp(5, 0, 10) // 5
clamp(-5, 0, 10) // 0
clamp(15, 0, 10) // 10

mapRange(5, 0, 10, 0, 100) // 50
mapRange(0.5, 0, 1, 0, 360) // 180

lerp(0, 100, 0.5) // 50
```

---

## 异步工具

```typescript
import { sleep, retry } from '@/lib/utils'

await sleep(1000) // 延迟 1 秒

const data = await retry(
  () => fetchData(),
  3, // 最多重试 3 次
  1000, // 初始延迟 1 秒
  30000, // 最大延迟 30 秒
  (error, attempt) => console.log(`重试 ${attempt}: ${error.message}`)
)
```

---

## 验证

```typescript
import { isValidEmail, isValidUrl } from '@/lib/utils'

isValidEmail('user@example.com') // true
isValidEmail('invalid-email') // false

isValidUrl('https://example.com') // true
isValidUrl('not-a-url') // false
```

---

## 工具函数

```typescript
import { isEmpty } from '@/lib/utils'

isEmpty(null) // true
isEmpty('') // true
isEmpty([]) // true
isEmpty({}) // true
isEmpty('hello') // false
```

---

## 性能优化

### optimizeImageUrl

优化图片 URL。

```typescript
import { optimizeImageUrl } from '@/lib/utils'

const optimizedUrl = optimizeImageUrl(
  'https://example.com/image.jpg',
  1200, // 宽度
  85 // 质量
)
```

### preloadResources

预加载重要资源。

```typescript
import { preloadResources } from '@/lib/utils'

preloadResources([
  { href: '/styles.css', as: 'style' },
  { href: '/app.js', as: 'script' },
])
```

### lazyLoadComponent

懒加载 React 组件。

```typescript
import { lazyLoadComponent } from '@/lib/utils'

const LazyComponent = lazyLoadComponent(() => import('./Component'))
```

---

## 日期工具

日期相关工具从 `src/lib/date.ts` 重新导出。

```typescript
import { formatTimeAgo, formatDate, formatDateTime, isToday, isYesterday } from '@/lib/utils'
```

---

## 完整函数列表

### 缓存

- `LRUCache<T>` - LRU 缓存类
- `createCache<T>()` - 创建缓存实例

### 防抖节流

- `advancedDebounce<T>()` - 高级防抖
- `debounce<T>()` - 简单防抖（已废弃）
- `advancedThrottle<T>()` - 高级节流
- `throttle<T>()` - 简单节流（已废弃）

### 数据操作

- `deepClone<T>()` - 深拷贝
- `memoize<T>()` - 函数缓存
- `batch<T>()` - 数组分批
- `shuffle<T>()` - 打乱数组
- `randomItem<T>()` - 随机元素
- `unique<T>()` - 数组去重
- `groupBy<T, K>()` - 数组分组
- `pick<T, K>()` - 选择属性
- `omit<T, K>()` - 排除属性

### 格式化

- `formatFileSize()` - 文件大小
- `formatNumber()` - 数字格式化
- `generateId()` - 生成 ID

### DOM 操作

- `getElementById<T>()` - ID 查询
- `querySelector<T>()` - 单元素查询
- `querySelectorAll<T>()` - 多元素查询
- `isInViewport()` - 视口检查
- `scrollToElement()` - 滚动到元素
- `getViewportSize()` - 视口尺寸
- `addEventListener<T>()` - 事件监听
- `debounceDOM<T>()` - DOM 事件防抖
- `throttleDOM<T>()` - DOM 事件节流
- `observeIntersection()` - Intersection Observer
- `observeResize()` - Resize Observer
- `copyToClipboard()` - 复制到剪贴板
- `readFromClipboard()` - 从剪贴板读取
- `getQueryParams()` - 获取查询参数
- `updateQueryParams()` - 更新查询参数
- `downloadFile()` - 下载文件
- `addClassWithDelay()` - 延迟添加类
- `toggleClass()` - 切换类
- `hasAllClasses()` - 检查所有类
- `hasAnyClass()` - 检查任意类
- `getComputedStyleValue()` - 获取样式值

### 环境检测

- `isClient()` - 客户端检测
- `isServer()` - 服务端检测
- `isBrowser()` - 浏览器检测
- `isNode()` - Node.js 检测
- `prefersReducedMotion()` - 减少动画偏好
- `prefersDarkMode()` - 深色模式偏好
- `prefersLightMode()` - 浅色模式偏好
- `isTouchDevice()` - 触摸设备检测
- `getDeviceType()` - 设备类型

### 数值计算

- `clamp()` - 限制范围
- `mapRange()` - 范围映射
- `lerp()` - 线性插值

### 异步工具

- `sleep()` - 延迟执行
- `retry<T>()` - 重试机制

### 验证

- `isValidEmail()` - 邮箱验证
- `isValidUrl()` - URL 验证

### 工具函数

- `isEmpty()` - 空值检查

### 性能优化

- `optimizeImageUrl()` - 图片优化
- `preloadResources()` - 资源预加载
- `lazyLoadComponent<T>()` - 组件懒加载

### 日期工具

- `formatTimeAgo()` - 时间间隔
- `formatDate()` - 日期格式化
- `formatDateTime()` - 日期时间
- `isToday()` - 今天检查
- `isYesterday()` - 昨天检查

---

## 类型安全

所有函数都使用 TypeScript 泛型，确保类型安全。

```typescript
// 类型推断
const items: number[] = [1, 2, 3]
const shuffled = shuffle(items) // number[]

// 显式类型
const cache = new LRUCache<UserData>()
const element = getElementById<HTMLButtonElement>('btn')

// 函数类型
const handler = debounceDOM((e: MouseEvent) => {
  console.log(e.clientX)
}, 100)
```

---

## 最佳实践

1. **使用高级版本**：优先使用 `advancedDebounce` 和 `advancedThrottle`
2. **资源清理**：使用返回的清理函数移除事件监听和观察器
3. **缓存限制**：为缓存设置合理的最大大小，避免内存泄漏
4. **类型安全**：充分利用 TypeScript 泛型
5. **错误处理**：异步函数使用 try-catch 包裹

---

## 相关文档

- [UTILS_OPTIMIZATION_REPORT.md](../UTILS_OPTIMIZATION_REPORT.md) - 详细优化报告
- [API.md](./API.md) - 项目 API 文档
- [CODE_STYLE.md](./CODE_STYLE.md) - 代码规范

---

_维护者: 7zi Studio AI 团队_
