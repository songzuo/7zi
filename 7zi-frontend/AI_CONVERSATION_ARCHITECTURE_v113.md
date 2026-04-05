# AI 对话系统增强架构设计文档 (v1.13.0)

**版本**: v1.13.0
**日期**: 2025-04-04
**作者**: 架构师团队
**状态**: 设计阶段

---

## 📋 目录

1. [概述](#概述)
2. [现有系统分析](#现有系统分析)
3. [设计目标](#设计目标)
4. [架构设计](#架构设计)
5. [核心模块](#核心模块)
6. [数据流设计](#数据流设计)
7. [技术实现](#技术实现)
8. [性能优化](#性能优化)
9. [测试策略](#测试策略)
10. [部署计划](#部署计划)

---

## 概述

本文档描述了 7zi-frontend 项目 AI 对话系统的增强架构设计，旨在提升多轮对话连贯性、意图理解准确率，并集成情感分析能力。

### 核心目标

- **多轮对话连贯性**: 从基础水平提升至 **>4.0/5**
- **意图理解准确率**: 达到 **>90%**
- **情感分析能力**: 集成情感识别与适应性响应

### 设计原则

1. **渐进增强**: 在现有基础上逐步增强，不破坏现有功能
2. **性能优先**: 优化响应时间，保持流式传输体验
3. **可扩展性**: 支持未来添加更多 AI 能力
4. **用户体验**: 无缝集成，提升自然对话体验

---

## 现有系统分析

### 当前架构 (v1.12.x)

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                             │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐      ┌──────────────┐                   │
│  │ ChatWindow   │─────▶│  AIChatStore │ (Zustand)         │
│  │  (UI)        │      │  (State)     │                   │
│  └──────────────┘      └──────────────┘                   │
│         │                       │                          │
│         ▼                       ▼                          │
│  ┌──────────────┐      ┌──────────────┐                   │
│  │   aiClient   │─────▶│ API Routes   │                   │
│  │  (Client)    │      │  (Mock)      │                   │
│  └──────────────┘      └──────────────┘                   │
│                                                         │
└─────────────────────────────────────────────────────────────┘
```

### 现有能力

| 功能模块 | 实现状态 | 能力水平 |
|---------|---------|---------|
| 基础对话 | ✅ 已实现 | 基础 |
| 流式响应 | ✅ 已实现 | 良好 |
| 对话历史 | ✅ 已实现 | 基础 |
| 建议系统 | ✅ 已实现 | 基础 |
| 多轮连贯 | ❌ 未实现 | N/A |
| 意图识别 | ❌ 未实现 | N/A |
| 情感分析 | ❌ 未实现 | N/A |

### 主要问题

1. **上下文跟踪不足**
   - 无对话状态机
   - 无话题转换检测
   - 无引用消解

2. **响应生成简单**
   - 基于关键词匹配
   - 无意图理解
   - 无上下文感知

3. **无情感感知**
   - 无法识别用户情绪
   - 无法调整回复语气
   - 无情感驱动的交互

---

## 设计目标

### 功能目标

| 指标 | 当前值 | 目标值 | 提升幅度 |
|-----|-------|-------|---------|
| 多轮对话连贯性评分 | ~2.5/5 | >4.0/5 | +60% |
| 意图理解准确率 | ~65% | >90% | +38% |
| 平均响应时间 | ~2s | <1.5s | -25% |
| 情感分析准确率 | 0% | >85% | N/A |

### 技术目标

- 支持至少 10 轮以上连续对话的连贯性
- 意图识别响应时间 <200ms
- 情感分析延迟 <100ms
- 上下文窗口支持 32K tokens
- 流式传输保持流畅（>50 chars/sec）

---

## 架构设计

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                                 │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │ ChatWindow  │  │Suggestion   │  │EmotionBar   │                  │
│  │  (UI)       │  │  Panel      │  │  (UI)       │                  │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘                  │
│         │                │                                           │
│         ▼                ▼                                           │
│  ┌─────────────────────────────────────┐                           │
│  │      AIChatStore (Zustand)          │                           │
│  │  ┌──────────────────────────────┐  │                           │
│  │  │ ConversationStateManager      │  │                           │
│  │  │ IntentRecognizer              │  │                           │
│  │  │ EmotionAnalyzer               │  │                           │
│  │  │ ContextWindowManager          │  │                           │
│  │  └──────────────────────────────┘  │                           │
│  └─────────────────────────────────────┘                           │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────┐                           │
│  │        AI Enhancement Service        │                           │
│  │  ┌──────────────────────────────┐  │                           │
│  │  │ - Intent Classification       │  │                           │
│  │  │ - Entity Extraction           │  │                           │
│  │  │ - Sentiment Analysis          │  │                           │
│  │  │ - Context Summarization       │  │                           │
│  │  └──────────────────────────────┘  │                           │
│  └─────────────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Backend API Layer                               │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐       │
│  │           AI Conversation Router (New)                  │       │
│  │  ┌────────────────────────────────────────────────┐     │       │
│  │  │ - Context Building                             │     │       │
│  │  │ - Intent Routing                               │     │       │
│  │  │ - Response Generation                           │     │       │
│  │  │ - Streaming Controller                          │     │       │
│  │  └────────────────────────────────────────────────┘     │       │
│  └──────────────────────────────────────────────────────────┘       │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │              AI Model Router (Existing + Enhanced)       │       │
│  │  ┌────────────────────────────────────────────────┐     │       │
│  │  │ - minimax / MiniMax-M2.7 (Default)             │     │       │
│  │  │ - volcengine (Code generation)                 │     │       │
│  │  │ - bailian (Analytical tasks)                   │     │       │
│  │  │ - self-claude (Creative tasks)                  │     │       │
│  │  └────────────────────────────────────────────────┘     │       │
│  └──────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

### 新增核心组件

#### 1. ConversationStateManager (对话状态管理器)

**职责**:
- 维护对话状态机（初始 → 进行中 → 完成 → 归档）
- 跟踪对话主题和话题转换
- 管理对话轮次和生命周期
- 检测对话连贯性指标

**接口设计**:

```typescript
interface ConversationState {
  id: string
  phase: 'initiation' | 'exploration' | 'clarification' | 'resolution' | 'closing'
  topic: string
  subTopics: string[]
  turnCount: number
  coherenceScore: number  // 0-1, 连贯性评分
  lastIntent: Intent
  lastEmotion: Emotion
  contextWindow: ContextWindow
  metadata: Record<string, any>
}

interface ConversationStateManager {
  // 状态转换
  transitionTo(state: ConversationPhase): void
  
  // 主题管理
  updateTopic(topic: string): void
  detectTopicChange(newMessage: string): boolean
  
  // 连贯性评分
  calculateCoherence(): number
  
  // 上下文管理
  buildContext(): ConversationContext
  
  // 状态持久化
  save(): void
  load(conversationId: string): ConversationState
}
```

#### 2. IntentRecognizer (意图识别器)

**职责**:
- 识别用户意图（查询、执行、澄清、闲聊等）
- 提取关键实体和参数
- 意图置信度评估
- 意图历史跟踪

**意图分类体系**:

```typescript
enum IntentType {
  // 查询类
  QUERY_WORKFLOW = 'query_workflow',      // 查询工作流
  QUERY_DATA = 'query_data',              // 查询数据
  QUERY_STATUS = 'query_status',          // 查询状态
  QUERY_HELP = 'query_help',              // 查询帮助
  
  // 执行类
  EXECUTE_WORKFLOW = 'execute_workflow',  // 执行工作流
  EXECUTE_CODE = 'execute_code',          // 执行代码
  EXECUTE_ACTION = 'execute_action',      // 执行操作
  
  // 管理类
  CREATE_WORKFLOW = 'create_workflow',    // 创建工作流
  EDIT_WORKFLOW = 'edit_workflow',        // 编辑工作流
  DELETE_WORKFLOW = 'delete_workflow',    // 删除工作流
  
  // 交互类
  CLARIFICATION = 'clarification',        // 澄清
  CONFIRMATION = 'confirmation',          // 确认
  NEGATION = 'negation',                  // 否认
  
  // 闲聊类
  GREETING = 'greeting',                  // 问候
  FAREWELL = 'farewell',                  // 告别
  CHITCHAT = 'chitchat',                  // 闲聊
  COMPLIMENT = 'compliment',              // 赞美
  COMPLAINT = 'complaint',                // 投诉
}

interface Intent {
  type: IntentType
  confidence: number  // 0-1
  entities: Entity[]
  parameters: Record<string, any>
  history: Intent[]
}

interface IntentRecognizer {
  // 意图识别
  recognize(message: string, context: ConversationContext): Promise<Intent>
  
  // 实体提取
  extractEntities(message: string): Entity[]
  
  // 意图验证
  validateIntent(intent: Intent): boolean
  
  // 意图跟踪
  trackIntent(intent: Intent): void
}
```

#### 3. EmotionAnalyzer (情感分析器)

**职责**:
- 分析用户情感（积极、消极、中性）
- 检测情感强度
- 识别情感趋势
- 触发适应性响应

**情感模型**:

```typescript
enum EmotionType {
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative',
  FRUSTRATED = 'frustrated',
  EXCITED = 'excited',
  CONFUSED = 'confused',
  SATISFIED = 'satisfied',
  ANGRY = 'angry'
}

interface Emotion {
  type: EmotionType
  intensity: number  // 0-1
  confidence: number  // 0-1
  keywords: string[]
  trend: 'improving' | 'stable' | 'declining'
}

interface EmotionAnalyzer {
  // 情感分析
  analyze(message: string, history: AIMessage[]): Promise<Emotion>
  
  // 情感趋势分析
  analyzeTrend(history: AIMessage[]): EmotionTrend
  
  // 适应性响应建议
  suggestResponse(emotion: Emotion): ResponseStyle
}

enum ResponseStyle {
  EMPATHETIC = 'empathetic',      // 共情
  CALM = 'calm',                  // 冷静
  ENTHUSIASTIC = 'enthusiastic',  // 热情
  REASSURING = 'reassuring',      // 安抚
  DIRECT = 'direct',              // 直接
}
```

#### 4. ContextWindowManager (上下文窗口管理器)

**职责**:
- 管理对话上下文窗口
- 智能压缩历史消息
- Token 计数和优化
- 上下文重要性评分

**策略设计**:

```typescript
interface ContextWindowConfig {
  maxTokens: number          // 最大 token 数 (e.g., 32000)
  strategy: 'recent' | 'summary' | 'hybrid'  // 压缩策略
  importanceWeights: {
    userMessage: number      // 用户消息权重
    assistantMessage: number // 助手消息权重
    systemPrompt: number     // 系统提示权重
    recentTurn: number       // 最近轮次权重
  }
}

interface ContextWindowManager {
  // 构建上下文
  buildContext(messages: AIMessage[], config: ContextWindowConfig): ConversationContext
  
  // Token 计算
  countTokens(text: string): number
  
  // 消息压缩
  summarizeMessages(messages: AIMessage[]): string
  
  // 重要性评分
  scoreMessage(message: AIMessage, context: ConversationContext): number
  
  // 窗口优化
  optimizeWindow(messages: AIMessage[]): AIMessage[]
}
```

---

## 核心模块

### 模块 1: 对话状态管理

#### 状态机设计

```
┌──────────────┐
│  Initiation  │  ← 对话开始，识别初始主题
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Exploration  │  ← 探索用户需求，收集信息
└──────┬───────┘
       │
       ▼
┌──────────────┐
│Clarification │  ← 澄清模糊需求，确认理解
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Resolution  │  ← 提供解决方案，完成任务
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Closing    │  ← 确认满意度，总结对话
└──────────────┘
```

#### 连贯性评分算法

```typescript
function calculateCoherence(state: ConversationState): number {
  const factors = {
    // 1. 主题一致性 (30%)
    topicConsistency: measureTopicConsistency(state),
    
    // 2. 意图连贯性 (25%)
    intentCoherence: measureIntentCoherence(state),
    
    // 3. 上下文相关性 (25%)
    contextRelevance: measureContextRelevance(state),
    
    // 4. 响应质量 (20%)
    responseQuality: measureResponseQuality(state),
  }
  
  return (
    factors.topicConsistency * 0.3 +
    factors.intentCoherence * 0.25 +
    factors.contextRelevance * 0.25 +
    factors.responseQuality * 0.2
  )
}

function measureTopicConsistency(state: ConversationState): number {
  // 分析主题转换是否自然
  // 计算 subTopics 与主 topic 的相关性
  // 检测突兀的主题跳跃
  // 返回 0-1 分数
}

function measureIntentCoherence(state: ConversationState): number {
  // 分析意图序列的逻辑性
  // 检测意图冲突
  // 计算意图转换的合理性
  // 返回 0-1 分数
}
```

### 模块 2: 意图识别

#### 意图识别流程

```
┌─────────────────┐
│  用户消息输入    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  文本预处理     │
│  - 分词         │
│  - 归一化       │
│  - 去停用词     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  特征提取       │
│  - TF-IDF       │
│  - 词向量       │
│  - 语法特征     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  意图分类       │
│  - 多类别分类   │
│  - 置信度评估   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  实体提取       │
│  - NER          │
│  - 参数提取     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  上下文验证     │
│  - 历史意图     │
│  - 对话状态     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  输出意图结果   │
└─────────────────┘
```

#### 意图识别实现

```typescript
class IntentRecognizerImpl implements IntentRecognizer {
  private model: any  // AI 模型实例
  private intentHistory: Intent[] = []
  
  async recognize(message: string, context: ConversationContext): Promise<Intent> {
    // 1. 文本预处理
    const preprocessed = this.preprocess(message)
    
    // 2. 特征提取
    const features = this.extractFeatures(preprocessed, context)
    
    // 3. 意图分类（使用 AI 模型）
    const classification = await this.classifyIntent(features)
    
    // 4. 实体提取
    const entities = await this.extractEntities(message)
    
    // 5. 上下文验证
    const validated = this.validateWithContext(classification, context)
    
    // 6. 构建意图对象
    const intent: Intent = {
      type: validated.type,
      confidence: validated.confidence,
      entities,
      parameters: this.extractParameters(entities),
      history: [...this.intentHistory, validated],
    }
    
    // 7. 跟踪意图历史
    this.trackIntent(intent)
    
    return intent
  }
  
  private preprocess(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')  // 保留中英文
      .replace(/\s+/g, ' ')
  }
  
  private async classifyIntent(features: any): Promise<{type: IntentType, confidence: number}> {
    // 调用 AI 模型进行意图分类
    const prompt = `
请分析以下用户消息的意图类型。

用户消息: "${features.text}"

可选意图类型:
${Object.values(IntentType).join('\n')}

请返回 JSON 格式:
{
  "type": "意图类型",
  "confidence": 0.95,
  "reasoning": "判断理由"
}
`
    
    const response = await this.model.generate(prompt)
    const result = JSON.parse(response)
    
    return {
      type: result.type,
      confidence: result.confidence,
    }
  }
  
  private extractEntities(message: string): Entity[] {
    // 使用 NER 提取实体
    // 可以使用规则匹配 + AI 模型
    const entities: Entity[] = []
    
    // 工作流名称提取
    const workflowMatch = message.match(/工作流\s*[:：]?\s*["']?([^"']+)["']?/i)
    if (workflowMatch) {
      entities.push({
        type: 'workflow_name',
        value: workflowMatch[1],
        confidence: 0.9,
      })
    }
    
    // 数据表名提取
    const tableMatch = message.match(/表\s*[:：]?\s*["']?([^"']+)["']?/i)
    if (tableMatch) {
      entities.push({
        type: 'table_name',
        value: tableMatch[1],
        confidence: 0.9,
      })
    }
    
    // 时间表达式提取
    const timeMatch = message.match(/(\d{4}-\d{2}-\d{2}|\d{1,2}天前|昨天|今天|明天|本周|本月)/)
    if (timeMatch) {
      entities.push({
        type: 'time',
        value: timeMatch[1],
        confidence: 0.95,
      })
    }
    
    return entities
  }
  
  private validateWithContext(classification: any, context: ConversationContext): any {
    // 基于对话历史验证意图
    // 检测意图转换的合理性
    
    const lastIntent = context.lastIntent
    
    // 意图转换合理性检查
    if (lastIntent) {
      const validTransitions = this.getValidTransitions(lastIntent.type)
      if (!validTransitions.includes(classification.type)) {
        // 意图转换不自然，降低置信度
        classification.confidence *= 0.7
      }
    }
    
    return classification
  }
  
  private getValidTransitions(fromIntent: IntentType): IntentType[] {
    // 定义意图转换规则
    const transitions: Record<IntentType, IntentType[]> = {
      [IntentType.GREETING]: [IntentType.QUERY_HELP, IntentType.CREATE_WORKFLOW, IntentType.CHITCHAT],
      [IntentType.QUERY_WORKFLOW]: [IntentType.QUERY_DATA, IntentType.EXECUTE_WORKFLOW, IntentType.EDIT_WORKFLOW],
      [IntentType.CREATE_WORKFLOW]: [IntentType.CLARIFICATION, IntentType.QUERY_HELP],
      [IntentType.CLARIFICATION]: [IntentType.CONFIRMATION, IntentType.NEGATION, IntentType.QUERY_HELP],
      // ... 更多转换规则
    }
    
    return transitions[fromIntent] || []
  }
}
```

### 模块 3: 情感分析

#### 情感识别流程

```
┌─────────────────┐
│  用户消息输入    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  情感词典匹配   │
│  - 正面词       │
│  - 负面词       │
│  - 情感词库     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  句法分析       │
│  - 程度副词     │
│  - 否定词       │
│  - 语气词       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AI 模型分析    │
│  - 细粒度情感   │
│  - 上下文感知   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  历史趋势分析   │
│  - 情感变化     │
│  - 趋势判断     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  输出情感结果   │
└─────────────────┘
```

#### 情感分析实现

```typescript
class EmotionAnalyzerImpl implements EmotionAnalyzer {
  private model: any
  private positiveWords: Set<string>
  private negativeWords: Set<string>
  private emotionKeywords: Record<EmotionType, Set<string>>
  
  constructor() {
    // 初始化情感词典
    this.positiveWords = new Set([
      '好', '棒', '优秀', '赞', '喜欢', '满意', '舒服', '顺利',
      'good', 'great', 'excellent', 'awesome', 'like', 'satisfied'
    ])
    
    this.negativeWords = new Set([
      '差', '坏', '糟糕', '失望', '难过', '不舒服', '麻烦', '困难',
      'bad', 'terrible', 'disappointed', 'sad', 'uncomfortable', 'trouble'
    ])
    
    this.emotionKeywords = {
      [EmotionType.POSITIVE]: this.positiveWords,
      [EmotionType.NEGATIVE]: this.negativeWords,
      [EmotionType.FRUSTRATED]: new Set(['烦', '恼火', '讨厌', 'frustrated', 'annoyed']),
      [EmotionType.EXCITED]: new Set(['兴奋', '激动', '期待', 'excited', 'thrilled']),
      [EmotionType.CONFUSED]: new Set(['困惑', '不明白', '搞不懂', 'confused', 'unclear']),
      [EmotionType.SATISFIED]: new Set(['满意', '满足', '开心', 'satisfied', 'happy']),
      [EmotionType.ANGRY]: new Set(['生气', '愤怒', '恨', 'angry', 'furious', 'hate']),
    }
  }
  
  async analyze(message: string, history: AIMessage[]): Promise<Emotion> {
    // 1. 基于词典的情感检测
    const dictionaryResult = this.analyzeByDictionary(message)
    
    // 2. AI 模型细粒度分析
    const modelResult = await this.analyzeByModel(message, history)
    
    // 3. 融合结果
    const emotion = this.mergeResults(dictionaryResult, modelResult)
    
    // 4. 更新历史趋势
    const trend = this.analyzeTrend(history)
    emotion.trend = trend
    
    return emotion
  }
  
  private analyzeByDictionary(message: string): {type: EmotionType, confidence: number} {
    let positiveScore = 0
    let negativeScore = 0
    const keywords: string[] = []
    
    // 匹配正面词
    for (const word of this.positiveWords) {
      if (message.includes(word)) {
        positiveScore++
        keywords.push(word)
      }
    }
    
    // 匹配负面词
    for (const word of this.negativeWords) {
      if (message.includes(word)) {
        negativeScore++
        keywords.push(word)
      }
    }
    
    // 匹配特定情感词
    for (const [type, words] of Object.entries(this.emotionKeywords)) {
      for (const word of words) {
        if (message.includes(word)) {
          return {
            type: type as EmotionType,
            confidence: Math.min(0.8, keywords.length * 0.2),
          }
        }
      }
    }
    
    // 基础情感判断
    if (positiveScore > negativeScore) {
      return { type: EmotionType.POSITIVE, confidence: Math.min(0.7, positiveScore * 0.3) }
    } else if (negativeScore > positiveScore) {
      return { type: EmotionType.NEGATIVE, confidence: Math.min(0.7, negativeScore * 0.3) }
    } else {
      return { type: EmotionType.NEUTRAL, confidence: 0.5 }
    }
  }
  
  private async analyzeByModel(message: string, history: AIMessage[]): Promise<Emotion> {
    // 使用 AI 模型进行细粒度情感分析
    const context = history.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')
    
    const prompt = `
请分析以下用户消息的情感。

对话历史:
${context}

当前用户消息: "${message}"

请返回 JSON 格式:
{
  "type": "positive|neutral|negative|frustrated|excited|confused|satisfied|angry",
  "intensity": 0.8,  // 0-1, 情感强度
  "confidence": 0.95,  // 0-1, 置信度
  "keywords": ["关键词1", "关键词2"],
  "reasoning": "分析理由"
}
`
    
    try {
      const response = await this.model.generate(prompt)
      const result = JSON.parse(response)
      
      return {
        type: result.type,
        intensity: result.intensity,
        confidence: result.confidence,
        keywords: result.keywords,
        trend: 'stable',
      }
    } catch (error) {
      // 模型失败时回退到词典方法
      return {
        type: EmotionType.NEUTRAL,
        intensity: 0,
        confidence: 0.3,
        keywords: [],
        trend: 'stable',
      }
    }
  }
  
  private mergeResults(dictResult: any, modelResult: Emotion): Emotion {
    // 加权融合两种结果
    // 模型结果权重 0.7, 词典结果权重 0.3
    
    if (modelResult.confidence > 0.7) {
      // 模型置信度高，使用模型结果
      return modelResult
    } else {
      // 模型置信度低，融合词典结果
      return {
        ...modelResult,
        type: dictResult.confidence > 0.5 ? dictResult.type : modelResult.type,
        confidence: Math.max(modelResult.confidence, dictResult.confidence * 0.5),
      }
    }
  }
  
  analyzeTrend(history: AIMessage[]): EmotionTrend {
    if (history.length < 3) return 'stable'
    
    const recentEmotions = history
      .slice(-5)
      .filter(m => m.role === 'user')
      .map(m => m.metadata?.emotion)
      .filter(Boolean)
    
    if (recentEmotions.length < 3) return 'stable'
    
    // 计算情感强度趋势
    const intensities = recentEmotions.map((e: any) => e.intensity)
    const avgIntensity = intensities.reduce((a, b) => a + b, 0) / intensities.length
    
    if (intensities[intensities.length - 1] > intensities[0] + 0.2) {
      return 'improving'
    } else if (intensities[intensities.length - 1] < intensities[0] - 0.2) {
      return 'declining'
    }
    
    return 'stable'
  }
  
  suggestResponse(emotion: Emotion): ResponseStyle {
    switch (emotion.type) {
      case EmotionType.POSITIVE:
      case EmotionType.SATISFIED:
      case EmotionType.EXCITED:
        return ResponseStyle.ENTHUSIASTIC
        
      case EmotionType.NEGATIVE:
      case EmotionType.FRUSTRATED:
      case EmotionType.ANGRY:
        return ResponseStyle.EMPATHETIC
        
      case EmotionType.CONFUSED:
        return ResponseStyle.REASSURING
        
      case EmotionType.NEUTRAL:
        return ResponseStyle.DIRECT
        
      default:
        return ResponseStyle.CALM
    }
  }
}
```

### 模块 4: 上下文窗口管理

#### 上下文压缩策略

```typescript
class ContextWindowManagerImpl implements ContextWindowManager {
  private defaultConfig: ContextWindowConfig = {
    maxTokens: 32000,
    strategy: 'hybrid',
    importanceWeights: {
      userMessage: 1.5,
      assistantMessage: 1.0,
      systemPrompt: 2.0,
      recentTurn: 2.0,
    }
  }
  
  buildContext(messages: AIMessage[], config?: Partial<ContextWindowConfig>): ConversationContext {
    const fullConfig = { ...this.defaultConfig, ...config }
    const sortedMessages = this.optimizeWindow(messages, fullConfig)
    
    // 策略选择
    switch (fullConfig.strategy) {
      case 'recent':
        return this.buildRecentContext(sortedMessages, fullConfig)
      case 'summary':
        return this.buildSummaryContext(sortedMessages, fullConfig)
      case 'hybrid':
      default:
        return this.buildHybridContext(sortedMessages, fullConfig)
    }
  }
  
  private buildRecentContext(messages: AIMessage[], config: ContextWindowConfig): ConversationContext {
    // 简单策略：只保留最近的消息
    const contextMessages: AIMessage[] = []
    let tokenCount = 0
    
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i]
      const messageTokens = this.countTokens(message.content)
      
      if (tokenCount + messageTokens > config.maxTokens) {
        break
      }
      
      contextMessages.unshift(message)
      tokenCount += messageTokens
    }
    
    return {
      messages: contextMessages,
      tokenCount,
      strategy: 'recent',
    }
  }
  
  private buildSummaryContext(messages: AIMessage[], config: ContextWindowConfig): ConversationContext {
    // 总结策略：压缩旧消息为摘要
    const recentMessages = messages.slice(-10)  // 保留最近 10 条完整消息
    const oldMessages = messages.slice(0, -10)
    
    let summary = ''
    if (oldMessages.length > 0) {
      summary = this.summarizeMessages(oldMessages)
    }
    
    const contextMessages: AIMessage[] = []
    let tokenCount = this.countTokens(summary)
    
    // 添加系统摘要消息
    if (summary) {
      contextMessages.push({
        id: 'summary',
        role: 'system',
        content: `[对话摘要] ${summary}`,
        timestamp: Date.now(),
      })
    }
    
    // 添加最近消息
    for (const message of recentMessages) {
      const messageTokens = this.countTokens(message.content)
      if (tokenCount + messageTokens > config.maxTokens) {
        break
      }
      contextMessages.push(message)
      tokenCount += messageTokens
    }
    
    return {
      messages: contextMessages,
      tokenCount,
      strategy: 'summary',
    }
  }
  
  private buildHybridContext(messages: AIMessage[], config: ContextWindowConfig): ConversationContext {
    // 混合策略：根据重要性选择消息
    const scoredMessages = messages.map(message => ({
      message,
      score: this.scoreMessage(message, config),
    }))
    
    // 按重要性排序
    scoredMessages.sort((a, b) => b.score - a.score)
    
    // 选择高重要性消息
    const contextMessages: AIMessage[] = []
    let tokenCount = 0
    
    for (const { message } of scoredMessages) {
      const messageTokens = this.countTokens(message.content)
      
      if (tokenCount + messageTokens > config.maxTokens) {
        break
      }
      
      contextMessages.push(message)
      tokenCount += messageTokens
    }
    
    // 按时间顺序重新排序
    contextMessages.sort((a, b) => a.timestamp - b.timestamp)
    
    return {
      messages: contextMessages,
      tokenCount,
      strategy: 'hybrid',
    }
  }
  
  countTokens(text: string): number {
    // 简单估算：中文字符 1 token，英文单词 0.75 token
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length
    return Math.ceil(chineseChars + englishWords * 0.75)
  }
  
  async summarizeMessages(messages: AIMessage[]): Promise<string> {
    // 使用 AI 模型生成摘要
    const conversation = messages.map(m => `${m.role}: ${m.content}`).join('\n')
    
    const prompt = `
请总结以下对话的核心内容，不超过 200 字。

对话内容:
${conversation}

摘要:
`
    
    try {
      const summary = await this.model.generate(prompt)
      return summary.trim()
    } catch (error) {
      // 回退：提取关键信息
      return this.extractKeyInfo(messages)
    }
  }
  
  private extractKeyInfo(messages: AIMessage[]): string {
    // 简单的关键信息提取
    const userMessages = messages.filter(m => m.role === 'user')
    const topics = userMessages.map(m => m.content.substring(0, 50)).join('; ')
    return `对话主题: ${topics}`
  }
  
  scoreMessage(message: AIMessage, config: ContextWindowConfig): number {
    let score = 0
    
    // 消息角色权重
    score += config.importanceWeights[message.role] || 1.0
    
    // 时间衰减（最近的消息权重更高）
    const age = Date.now() - message.timestamp
    const ageFactor = Math.max(0.1, 1 - age / (7 * 24 * 60 * 60 * 1000))  // 7 天衰减
    score *= ageFactor
    
    // 消息长度（长消息可能包含更多信息）
    const lengthFactor = Math.min(2.0, message.content.length / 100)
    score *= lengthFactor
    
    // 是否包含关键实体
    if (message.metadata?.entities?.length > 0) {
      score *= 1.5
    }
    
    return score
  }
  
  optimizeWindow(messages: AIMessage[], config: ContextWindowConfig): AIMessage[] {
    // 移除重复或低价值消息
    const seen = new Set<string>()
    const optimized: AIMessage[] = []
    
    for (const message of messages) {
      const hash = this.hashMessage(message)
      
      // 跳过重复消息
      if (seen.has(hash)) continue
      seen.add(hash)
      
      // 跳过过短的消息（除非是用户消息）
      if (message.content.length < 5 && message.role !== 'user') continue
      
      optimized.push(message)
    }
    
    return optimized
  }
  
  private hashMessage(message: AIMessage): string {
    return `${message.role}:${message.content.substring(0, 50)}`
  }
}
```

---

## 数据流设计

### 完整对话流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                        用户发送消息                                  │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│              1. 前端处理 (AIChatStore)                               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ - 创建用户消息对象                                            │  │
│  │ - 添加到消息列表                                              │  │
│  │ - 更新状态为 'typing'                                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│              2. 意图识别 (IntentRecognizer)                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ - 文本预处理                                                  │  │
│  │ - 特征提取                                                    │  │
│  │ - 意图分类 (AI 模型)                                          │  │
│  │ - 实体提取                                                    │  │
│  │ - 上下文验证                                                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│                    输出: Intent 对象                                │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│              3. 情感分析 (EmotionAnalyzer)                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ - 情感词典匹配                                                │  │
│  │ - AI 模型细粒度分析                                            │  │
│  │ - 结果融合                                                    │  │
│  │ - 趋势分析                                                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│                    输出: Emotion 对象                               │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│              4. 状态管理 (ConversationStateManager)                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ - 更新对话状态                                                │  │
│  │ - 检测主题转换                                                │  │
│  │ - 计算连贯性评分                                              │  │
│  │ - 构建上下文窗口                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│                    输出: ConversationContext                         │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│              5. 上下文构建 (ContextWindowManager)                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ - 选择压缩策略                                                │  │
│  │ - Token 计数                                                  │  │
│  │ - 消息重要性评分                                              │  │
│  │ - 窗口优化                                                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│                    输出: 优化的上下文                                │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│              6. 响应生成 (AI Model Router)                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ - 根据意图选择模型                                            │  │
│  │ - 构建系统提示                                                │  │
│  │ - 生成响应 (流式)                                             │  │
│  │ - 适应性语气调整                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│              7. 流式传输 (Streaming Controller)                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ - 分块发送响应                                                │  │
│  │ - 实时更新 UI                                                 │  │
│  │ - 统计传输数据                                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│              8. 后处理 (AIChatStore)                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ - 完成助手消息                                                │  │
│  │ - 更新对话状态                                                │  │
│  │ - 保存对话历史                                                │  │
│  │ - 更新连贯性评分                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        显示响应给用户                                │
└─────────────────────────────────────────────────────────────────────┘
```

### 数据结构流转

```typescript
// 1. 用户输入
const userInput = "帮我创建一个定时工作流，每天早上9点发送邮件"

// 2. 意图识别结果
const intent: Intent = {
  type: IntentType.CREATE_WORKFLOW,
  confidence: 0.92,
  entities: [
    { type: 'time', value: '每天早上9点', confidence: 0.95 },
    { type: 'action', value: '发送邮件', confidence: 0.90 }
  ],
  parameters: {
    schedule: '0 9 * * *',
    action: 'send_email'
  },
  history: []
}

// 3. 情感分析结果
const emotion: Emotion = {
  type: EmotionType.NEUTRAL,
  intensity: 0.3,
  confidence: 0.85,
  keywords: [],
  trend: 'stable'
}

// 4. 对话状态
const state: ConversationState = {
  id: 'conv_123',
  phase: 'exploration',
  topic: '工作流创建',
  subTopics: ['定时任务', '邮件发送'],
  turnCount: 3,
  coherenceScore: 0.85,
  lastIntent: intent,
  lastEmotion: emotion,
  contextWindow: { /* ... */ },
  metadata: {}
}

// 5. 上下文构建
const context: ConversationContext = {
  conversationId: 'conv_123',
  systemPrompt: '你是一个专业的AI助手...',
  messages: [ /* 优化的消息列表 */ ],
  tokenCount: 12500,
  intent: intent,
  emotion: emotion,
  maxTokens: 32000
}

// 6. AI 响应（流式）
const streamChunks = [
  { delta: '好的', done: false },
  { delta: '，我来', done: false },
  { delta: '帮你创建', done: false },
  // ...
  { delta: '工作流。', done: true, usage: { /* ... */ } }
]
```

---

## 技术实现

### 前端实现

#### 目录结构

```
src/
├── components/ui/ai-chat/
│   ├── ChatWindow.tsx              # 主聊天窗口
│   ├── ChatMessage.tsx             # 消息组件
│   ├── ChatInput.tsx               # 输入组件
│   ├── SuggestionPanel.tsx         # 建议面板
│   ├── EmotionBar.tsx              # 情感指示器 (新增)
│   ├── store.ts                    # Zustand 状态管理
│   ├── client.ts                   # API 客户端
│   ├── types.ts                    # 类型定义
│   ├── conversation-state.ts       # 对话状态管理器 (新增)
│   ├── intent-recognizer.ts        # 意图识别器 (新增)
│   ├── emotion-analyzer.ts         # 情感分析器 (新增)
│   ├── context-window.ts           # 上下文窗口管理器 (新增)
│   └── index.ts
├── hooks/
│   ├── useAIConversation.ts        # 对话 Hook (新增)
│   ├── useIntentRecognition.ts     # 意图识别 Hook (新增)
│   └── useEmotionAnalysis.ts       # 情感分析 Hook (新增)
└── lib/ai/
    ├── enhancement-service.ts      # AI 增强服务 (新增)
    └── model-router.ts             # 模型路由器 (增强)
```

#### 核心代码示例

**conversation-state.ts**

```typescript
/**
 * ConversationStateManager - 对话状态管理器
 * v1.13.0
 */

import { v4 as uuidv4 } from 'uuid'
import type {
  ConversationState,
  ConversationPhase,
  Intent,
  Emotion,
  ConversationContext,
} from '@/components/ui/ai-chat/types'
import { IntentRecognizer } from './intent-recognizer'
import { EmotionAnalyzer } from './emotion-analyzer'
import { ContextWindowManager } from './context-window'

export class ConversationStateManager {
  private state: ConversationState
  private intentRecognizer: IntentRecognizer
  private emotionAnalyzer: EmotionAnalyzer
  private contextWindowManager: ContextWindowManager
  
  constructor(initialState?: Partial<ConversationState>) {
    this.state = {
      id: uuidv4(),
      phase: 'initiation',
      topic: '',
      subTopics: [],
      turnCount: 0,
      coherenceScore: 0,
      lastIntent: null,
      lastEmotion: null,
      contextWindow: null,
      metadata: {},
      ...initialState,
    }
    
    this.intentRecognizer = new IntentRecognizer()
    this.emotionAnalyzer = new EmotionAnalyzer()
    this.contextWindowManager = new ContextWindowManager()
  }
  
  /**
   * 处理用户消息
   */
  async processUserMessage(message: string, history: AIMessage[]): Promise<ConversationContext> {
    // 1. 意图识别
    const intent = await this.intentRecognizer.recognize(message, {
      conversationId: this.state.id,
      lastIntent: this.state.lastIntent,
    })
    
    // 2. 情感分析
    const emotion = await this.emotionAnalyzer.analyze(message, history)
    
    // 3. 更新状态
    this.updateState(intent, emotion)
    
    // 4. 构建上下文
    const context = this.buildContext(history)
    
    return context
  }
  
  /**
   * 更新对话状态
   */
  private updateState(intent: Intent, emotion: Emotion): void {
    this.state.lastIntent = intent
    this.state.lastEmotion = emotion
    this.state.turnCount++
    
    // 状态转换
    this.transitionPhase(intent)
    
    // 主题更新
    this.updateTopic(intent)
    
    // 连贯性评分
    this.state.coherenceScore = this.calculateCoherence()
  }
  
  /**
   * 状态转换
   */
  private transitionPhase(intent: Intent): void {
    const currentPhase = this.state.phase
    
    switch (currentPhase) {
      case 'initiation':
        if (intent.type === IntentType.GREETING) {
          this.state.phase = 'exploration'
        }
        break
        
      case 'exploration':
        if (intent.type === IntentType.CLARIFICATION) {
          this.state.phase = 'clarification'
        } else if (intent.type === IntentType.CONFIRMATION) {
          this.state.phase = 'resolution'
        }
        break
        
      case 'clarification':
        if (intent.type === IntentType.CONFIRMATION) {
          this.state.phase = 'resolution'
        } else if (intent.type === IntentType.NEGATION) {
          this.state.phase = 'exploration'
        }
        break
        
      case 'resolution':
        if (intent.type === IntentType.FAREWELL || intent.type === IntentType.COMPLIMENT) {
          this.state.phase = 'closing'
        }
        break
        
      case 'closing':
        // 对话结束
        break
    }
  }
  
  /**
   * 更新主题
   */
  private updateTopic(intent: Intent): void {
    // 从实体中提取主题
    const topicEntity = intent.entities.find(e => e.type === 'topic')
    if (topicEntity) {
      const newTopic = topicEntity.value as string
      
      // 检测主题转换
      if (this.state.topic && newTopic !== this.state.topic) {
        if (this.detectTopicChange(newTopic)) {
          this.state.subTopics.push(this.state.topic)
          this.state.topic = newTopic
        }
      } else {
        this.state.topic = newTopic
      }
    }
  }
  
  /**
   * 检测主题转换
   */
  private detectTopicChange(newTopic: string): boolean {
    // 简单的主题转换检测
    // 可以使用语义相似度计算
    return true
  }
  
  /**
   * 计算连贯性评分
   */
  private calculateCoherence(): number {
    const factors = {
      topicConsistency: this.measureTopicConsistency(),
      intentCoherence: this.measureIntentCoherence(),
      contextRelevance: this.measureContextRelevance(),
      responseQuality: this.measureResponseQuality(),
    }
    
    return (
      factors.topicConsistency * 0.3 +
      factors.intentCoherence * 0.25 +
      factors.contextRelevance * 0.25 +
      factors.responseQuality * 0.2
    )
  }
  
  private measureTopicConsistency(): number {
    // 实现主题一致性测量
    return 0.85
  }
  
  private measureIntentCoherence(): number {
    // 实现意图连贯性测量
    return 0.90
  }
  
  private measureContextRelevance(): number {
    // 实现上下文相关性测量
    return 0.88
  }
  
  private measureResponseQuality(): number {
    // 实现响应质量测量
    return 0.87
  }
  
  /**
   * 构建上下文
   */
  private buildContext(history: AIMessage[]): ConversationContext {
    return this.contextWindowManager.buildContext(history, {
      maxTokens: 32000,
      strategy: 'hybrid',
    })
  }
  
  /**
   * 获取当前状态
   */
  getState(): ConversationState {
    return { ...this.state }
  }
  
  /**
   * 保存状态
   */
  save(): void {
    // 持久化到 localStorage 或 IndexedDB
    localStorage.setItem(
      `conversation_${this.state.id}`,
      JSON.stringify(this.state)
    )
  }
  
  /**
   * 加载状态
   */
  static load(conversationId: string): ConversationStateManager | null {
    const data = localStorage.getItem(`conversation_${conversationId}`)
    if (!data) return null
    
    const state = JSON.parse(data)
    return new ConversationStateManager(state)
  }
}
```

**intent-recognizer.ts**

```typescript
/**
 * IntentRecognizer - 意图识别器
 * v1.13.0
 */

import type { Intent, IntentType, Entity, ConversationContext } from '@/components/ui/ai-chat/types'
import { aiClient } from './client'

export class IntentRecognizer {
  private intentHistory: Intent[] = []
  
  /**
   * 识别意图
   */
  async recognize(message: string, context: ConversationContext): Promise<Intent> {
    // 1. 文本预处理
    const preprocessed = this.preprocess(message)
    
    // 2. 特征提取
    const features = this.extractFeatures(preprocessed, context)
    
    // 3. 意图分类
    const classification = await this.classifyIntent(features)
    
    // 4. 实体提取
    const entities = this.extractEntities(message)
    
    // 5. 上下文验证
    const validated = this.validateWithContext(classification, context)
    
    // 6. 构建意图对象
    const intent: Intent = {
      type: validated.type,
      confidence: validated.confidence,
      entities,
      parameters: this.extractParameters(entities),
      history: [...this.intentHistory],
    }
    
    // 7. 跟踪意图历史
    this.trackIntent(intent)
    
    return intent
  }
  
  private preprocess(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
      .replace(/\s+/g, ' ')
  }
  
  private extractFeatures(text: string, context: ConversationContext): any {
    return {
      text,
      length: text.length,
      hasQuestion: text.includes('?') || text.includes('？'),
      hasAction: /创建|删除|编辑|执行|运行/.test(text),
      context: context,
    }
  }
  
  private async classifyIntent(features: any): Promise<{type: IntentType, confidence: number}> {
    // 调用 AI 模型进行意图分类
    const prompt = `
请分析以下用户消息的意图类型。

用户消息: "${features.text}"

可选意图类型:
- query_workflow: 查询工作流
- query_data: 查询数据
- create_workflow: 创建工作流
- execute_workflow: 执行工作流
- edit_workflow: 编辑工作流
- delete_workflow: 删除工作流
- clarification: 澄清
- confirmation: 确认
- negation: 否认
- greeting: 问候
- farewell: 告别
- chitchat: 闲聊

请返回 JSON 格式:
{
  "type": "意图类型",
  "confidence": 0.95,
  "reasoning": "判断理由"
}
`
    
    try {
      const response = await aiClient.sendMessage({
        content: prompt,
        stream: false,
      })
      
      const result = JSON.parse(response.message.content)
      return {
        type: result.type,
        confidence: result.confidence,
      }
    } catch (error) {
      // 回退到规则匹配
      return this.classifyByRules(features.text)
    }
  }
  
  private classifyByRules(text: string): {type: IntentType, confidence: number} {
    // 简单的规则匹配
    if (/你好|hi|hello/.test(text)) {
      return { type: IntentType.GREETING, confidence: 0.9 }
    }
    if (/再见|拜拜|bye/.test(text)) {
      return { type: IntentType.FAREWELL, confidence: 0.9 }
    }
    if (/创建|新建|make|create/.test(text)) {
      return { type: IntentType.CREATE_WORKFLOW, confidence: 0.85 }
    }
    if (/执行|运行|run|execute/.test(text)) {
      return { type: IntentType.EXECUTE_WORKFLOW, confidence: 0.85 }
    }
    if (/删除|remove|delete/.test(text)) {
      return { type: IntentType.DELETE_WORKFLOW, confidence: 0.85 }
    }
    if (/编辑|修改|edit|modify/.test(text)) {
      return { type: IntentType.EDIT_WORKFLOW, confidence: 0.85 }
    }
    if (/是|对|yes|ok/.test(text)) {
      return { type: IntentType.CONFIRMATION, confidence: 0.8 }
    }
    if (/不|no|不是/.test(text)) {
      return { type: IntentType.NEGATION, confidence: 0.8 }
    }
    if (/什么|怎么|如何|what|how/.test(text)) {
      return { type: IntentType.QUERY_HELP, confidence: 0.75 }
    }
    
    return { type: IntentType.CHITCHAT, confidence: 0.5 }
  }
  
  private extractEntities(message: string): Entity[] {
    const entities: Entity[] = []
    
    // 工作流名称
    const workflowMatch = message.match(/工作流\s*[:：]?\s*["']?([^"']+)["']?/i)
    if (workflowMatch) {
      entities.push({
        type: 'workflow_name',
        value: workflowMatch[1],
        confidence: 0.9,
      })
    }
    
    // 时间表达式
    const timeMatch = message.match(/(\d{4}-\d{2}-\d{2}|\d{1,2}天前|昨天|今天|明天|本周|本月|每天|每周)/)
    if (timeMatch) {
      entities.push({
        type: 'time',
        value: timeMatch[1],
        confidence: 0.95,
      })
    }
    
    // 数据表名
    const tableMatch = message.match(/表\s*[:：]?\s*["']?([^"']+)["']?/i)
    if (tableMatch) {
      entities.push({
        type: 'table_name',
        value: tableMatch[1],
        confidence: 0.9,
      })
    }
    
    return entities
  }
  
  private extractParameters(entities: Entity[]): Record<string, any> {
    const params: Record<string, any> = {}
    
    for (const entity of entities) {
      params[entity.type] = entity.value
    }
    
    return params
  }
  
  private validateWithContext(classification: any, context: ConversationContext): any {
    const lastIntent = context.lastIntent
    
    if (lastIntent) {
      const validTransitions = this.getValidTransitions(lastIntent.type)
      if (!validTransitions.includes(classification.type)) {
        classification.confidence *= 0.7
      }
    }
    
    return classification
  }
  
  private getValidTransitions(fromIntent: IntentType): IntentType[] {
    const transitions: Record<IntentType, IntentType[]> = {
      [IntentType.GREETING]: [
        IntentType.QUERY_HELP,
        IntentType.CREATE_WORKFLOW,
        IntentType.CHITCHAT,
      ],
      [IntentType.QUERY_WORKFLOW]: [
        IntentType.QUERY_DATA,
        IntentType.EXECUTE_WORKFLOW,
        IntentType.EDIT_WORKFLOW,
      ],
      [IntentType.CREATE_WORKFLOW]: [
        IntentType.CLARIFICATION,
        IntentType.QUERY_HELP,
      ],
      [IntentType.CLARIFICATION]: [
        IntentType.CONFIRMATION,
        IntentType.NEGATION,
        IntentType.QUERY_HELP,
      ],
    }
    
    return transitions[fromIntent] || []
  }
  
  private trackIntent(intent: Intent): void {
    this.intentHistory.push(intent)
    // 保留最近 10 个意图
    if (this.intentHistory.length > 10) {
      this.intentHistory.shift()
    }
  }
}
```

### 后端实现

#### 新增 API 路由

**src/app/api/ai/conversation/route.ts**

```typescript
/**
 * AI Conversation Enhancement API
 * POST /api/ai/conversation - 增强型对话处理
 * v1.13.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { ConversationEnhancementService } from '@/lib/ai/enhancement-service'

const enhancementService = new ConversationEnhancementService()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { message, conversationId, history } = body
    
    if (!message?.trim()) {
      return NextResponse.json(
        { error: '消息内容不能为空' },
        { status: 400 }
      )
    }
    
    // 增强处理
    const enhanced = await enhancementService.enhanceConversation({
      message,
      conversationId,
      history: history || [],
    })
    
    return NextResponse.json(enhanced)
  } catch (error) {
    logger.error('[AI Conversation Enhancement] Error:', error)
    return NextResponse.json(
      { error: '处理失败' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
```

**src/lib/ai/enhancement-service.ts**

```typescript
/**
 * AI Conversation Enhancement Service
 * v1.13.0
 */

import { IntentRecognizer } from '@/components/ui/ai-chat/intent-recognizer'
import { EmotionAnalyzer } from '@/components/ui/ai-chat/emotion-analyzer'
import { ContextWindowManager } from '@/components/ui/ai-chat/context-window'
import { AIModelRouter } from './model-router'
import type { AIMessage, ConversationContext } from '@/components/ui/ai-chat/types'

interface EnhancementRequest {
  message: string
  conversationId: string
  history: AIMessage[]
}

interface EnhancementResponse {
  intent: any
  emotion: any
  context: ConversationContext
  suggestedResponse: string
  responseStyle: string
}

export class ConversationEnhancementService {
  private intentRecognizer: IntentRecognizer
  private emotionAnalyzer: EmotionAnalyzer
  private contextWindowManager: ContextWindowManager
  private modelRouter: AIModelRouter
  
  constructor() {
    this.intentRecognizer = new IntentRecognizer()
    this.emotionAnalyzer = new EmotionAnalyzer()
    this.contextWindowManager = new ContextWindowManager()
    this.modelRouter = new AIModelRouter()
  }
  
  async enhanceConversation(request: EnhancementRequest): Promise<EnhancementResponse> {
    const { message, conversationId, history } = request
    
    // 1. 意图识别
    const intent = await this.intentRecognizer.recognize(message, {
      conversationId,
      lastIntent: history[history.length - 1]?.metadata?.intent,
    })
    
    // 2. 情感分析
    const emotion = await this.emotionAnalyzer.analyze(message, history)
    
    // 3. 构建上下文
    const context = this.contextWindowManager.buildContext(history, {
      maxTokens: 32000,
      strategy: 'hybrid',
    })
    
    // 4. 选择响应风格
    const responseStyle = this.emotionAnalyzer.suggestResponse(emotion)
    
    // 5. 生成建议响应
    const suggestedResponse = await this.generateSuggestedResponse(
      message,
      intent,
      emotion,
      context,
      responseStyle
    )
    
    return {
      intent,
      emotion,
      context,
      suggestedResponse,
      responseStyle,
    }
  }
  
  private async generateSuggestedResponse(
    message: string,
    intent: any,
    emotion: any,
    context: ConversationContext,
    responseStyle: string
  ): Promise<string> {
    // 根据意图选择合适的 AI 模型
    const model = this.modelRouter.selectModel(intent.type)
    
    // 构建系统提示
    const systemPrompt = this.buildSystemPrompt(intent, emotion, responseStyle)
    
    // 生成响应
    const response = await model.generate({
      message,
      context,
      systemPrompt,
    })
    
    return response
  }
  
  private buildSystemPrompt(intent: any, emotion: any, responseStyle: string): string {
    const styleInstructions: Record<string, string> = {
      empathetic: '请用共情、理解的语气回复，表达对用户感受的理解。',
      enthusiastic: '请用热情、积极的语气回复，展现活力和积极性。',
      reassuring: '请用安抚、鼓励的语气回复，帮助用户建立信心。',
      direct: '请用直接、简洁的语气回复，快速给出答案。',
      calm: '请用冷静、专业的语气回复，保持客观和理性。',
    }
    
    return `你是一个专业的AI助手。

当前用户意图: ${intent.type}
用户情感: ${emotion.type} (强度: ${emotion.intensity})

回复风格: ${responseStyle}
${styleInstructions[responseStyle] || ''}

请根据以上信息生成合适的回复。`
  }
}
```

---

## 性能优化

### 前端优化

1. **意图识别缓存**
   - 缓存常见意图的识别结果
   - 使用 LRU 策略管理缓存
   - 预期减少 40% 的 API 调用

2. **情感分析优化**
   - 词典匹配优先（<50ms）
   - AI 模型作为后备
   - 批量处理历史消息

3. **上下文窗口优化**
   - 增量更新而非全量重建
   - 使用 Web Worker 进行后台计算
   - 预计算消息重要性

4. **状态管理优化**
   - 使用 Zustand 的 selector 优化
   - 避免不必要的重渲染
   - 虚拟滚动长对话列表

### 后端优化

1. **模型路由优化**
   - 根据意图类型选择最优模型
   - 模型预热和连接池
   - 并行处理多个请求

2. **流式响应优化**
   - 使用 Server-Sent Events (SSE)
   - 分块大小优化（100-200 字符）
   - 心跳机制保持连接

3. **缓存策略**
   - Redis 缓存常见对话模式
   - CDN 缓存静态资源
   - 浏览器缓存 API 响应

### 性能指标

| 指标 | 目标值 | 当前值 | 优化策略 |
|-----|-------|-------|---------|
| 意图识别延迟 | <200ms | ~500ms | 缓存 + 规则优先 |
| 情感分析延迟 | <100ms | ~300ms | 词典匹配优先 |
| 首字响应时间 | <500ms | ~800ms | 流式优化 |
| 上下文构建时间 | <300ms | ~600ms | 增量更新 |
| 内存占用 | <50MB | ~80MB | 窗口优化 |

---

## 测试策略

### 单元测试

```typescript
// __tests__/intent-recognizer.test.ts
describe('IntentRecognizer', () => {
  let recognizer: IntentRecognizer
  
  beforeEach(() => {
    recognizer = new IntentRecognizer()
  })
  
  test('should recognize greeting intent', async () => {
    const intent = await recognizer.recognize('你好', {})
    expect(intent.type).toBe(IntentType.GREETING)
    expect(intent.confidence).toBeGreaterThan(0.8)
  })
  
  test('should extract workflow name entity', async () => {
    const intent = await recognizer.recognize('创建工作流: 数据同步', {})
    const workflowEntity = intent.entities.find(e => e.type === 'workflow_name')
    expect(workflowEntity?.value).toBe('数据同步')
  })
  
  test('should validate intent transition', async () => {
    const context = {
      lastIntent: { type: IntentType.GREETING }
    }
    const intent = await recognizer.recognize('创建工作流', context)
    expect(intent.confidence).toBeGreaterThan(0.7)
  })
})

// __tests__/emotion-analyzer.test.ts
describe('EmotionAnalyzer', () => {
  let analyzer: EmotionAnalyzer
  
  beforeEach(() => {
    analyzer = new EmotionAnalyzer()
  })
  
  test('should detect positive emotion', async () => {
    const emotion = await analyzer.analyze('太棒了，非常满意！', [])
    expect(emotion.type).toBe(EmotionType.POSITIVE)
    expect(emotion.intensity).toBeGreaterThan(0.5)
  })
  
  test('should detect frustrated emotion', async () => {
    const emotion = await analyzer.analyze('这太烦人了，搞不懂', [])
    expect(emotion.type).toBe(EmotionType.FRUSTRATED)
  })
  
  test('should suggest empathetic response for negative emotion', () => {
    const emotion = {
      type: EmotionType.NEGATIVE,
      intensity: 0.8,
    }
    const style = analyzer.suggestResponse(emotion)
    expect(style).toBe(ResponseStyle.EMPATHETIC)
  })
})
```

### 集成测试

```typescript
// __tests__/conversation-flow.test.ts
describe('Conversation Flow Integration', () => {
  test('should maintain coherence across multiple turns', async () => {
    const manager = new ConversationStateManager()
    
    // 第一轮
    const context1 = await manager.processUserMessage('创建工作流', [])
    expect(context1.intent.type).toBe(IntentType.CREATE_WORKFLOW)
    
    // 第二轮
    const context2 = await manager.processUserMessage('每天早上9点', [
      { role: 'user', content: '创建工作流' },
      { role: 'assistant', content: '好的，请告诉我触发条件' }
    ])
    expect(context2.intent.type).toBe(IntentType.CLARIFICATION)
    
    // 第三轮
    const context3 = await manager.processUserMessage('发送邮件', [
      { role: 'user', content: '创建工作流' },
      { role: 'assistant', content: '好的，请告诉我触发条件' },
      { role: 'user', content: '每天早上9点' },
      { role: 'assistant', content: '好的，请告诉我执行动作' },
      { role: 'user', content: '发送邮件' }
    ])
    expect(context3.intent.type).toBe(IntentType.CONFIRMATION)
    
    // 检查连贯性
    const state = manager.getState()
    expect(state.coherenceScore).toBeGreaterThan(0.8)
  })
})
```

### 性能测试

```typescript
// __tests__/performance.test.ts
describe('Performance Tests', () => {
  test('intent recognition should complete within 200ms', async () => {
    const recognizer = new IntentRecognizer()
    const start = Date.now()
    
    await recognizer.recognize('创建一个定时工作流', {})
    
    const duration = Date.now() - start
    expect(duration).toBeLessThan(200)
  })
  
  test('emotion analysis should complete within 100ms', async () => {
    const analyzer = new EmotionAnalyzer()
    const start = Date.now()
    
    await analyzer.analyze('我很满意这个功能', [])
    
    const duration = Date.now() - start
    expect(duration).toBeLessThan(100)
  })
  
  test('context building should handle 100 messages efficiently', () => {
    const manager = new ContextWindowManager()
    const messages = Array.from({ length: 100 }, (_, i) => ({
      id: `msg_${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`,
      timestamp: Date.now() - i * 1000,
    }))
    
    const start = Date.now()
    const context = manager.buildContext(messages)
    const duration = Date.now() - start
    
    expect(duration).toBeLessThan(300)
    expect(context.tokenCount).toBeLessThan(32000)
  })
})
```

### E2E 测试

```typescript
// e2e/ai-chat.spec.ts
import { test, expect } from '@playwright/test'

test.describe('AI Chat E2E', () => {
  test('should maintain conversation coherence', async ({ page }) => {
    await page.goto('/ai-chat')
    
    // 发送第一条消息
    await page.fill('[data-testid="chat-input"]', '创建工作流')
    await page.click('[data-testid="send-button"]')
    
    // 等待响应
    await expect(page.locator('[data-testid="message-assistant"]')).toBeVisible()
    
    // 发送第二条消息
    await page.fill('[data-testid="chat-input"]', '每天早上9点')
    await page.click('[data-testid="send-button"]')
    
    // 验证连贯性
    const messages = await page.locator('[data-testid="message"]').all()
    expect(messages.length).toBeGreaterThanOrEqual(4)
    
    // 验证情感指示器
    await expect(page.locator('[data-testid="emotion-indicator"]')).toBeVisible()
  })
  
  test('should adapt response based on user emotion', async ({ page }) => {
    await page.goto('/ai-chat')
    
    // 发送负面情绪消息
    await page.fill('[data-testid="chat-input"]', '这太烦人了，搞不懂')
    await page.click('[data-testid="send-button"]')
    
    // 验证共情响应
    const response = await page.locator('[data-testid="message-assistant"]').last()
    await expect(response).toContainText(/理解|抱歉|别着急/)
  })
})
```

---

## 部署计划

### 阶段 1: 基础设施准备 (Week 1)

- [ ] 创建新的 API 路由
- [ ] 设置开发环境
- [ ] 配置 CI/CD 流程
- [ ] 准备测试数据

### 阶段 2: 核心模块开发 (Week 2-3)

- [ ] 实现 IntentRecognizer
- [ ] 实现 EmotionAnalyzer
- [ ] 实现 ConversationStateManager
- [ ] 实现 ContextWindowManager
- [ ] 单元测试覆盖 >80%

### 阶段 3: 集成与优化 (Week 4)

- [ ] 集成到现有 AIChatStore
- [ ] 性能优化
- [ ] 集成测试
- [ ] E2E 测试

### 阶段 4: 测试与验证 (Week 5)

- [ ] 用户测试
- [ ] 性能基准测试
- [ ] Bug 修复
- [ ] 文档完善

### 阶段 5: 部署与监控 (Week 6)

- [ ] 灰度发布 (10%)
- [ ] 监控关键指标
- [ ] 逐步扩大到 100%
- [ ] 持续优化

### 部署检查清单

- [ ] 所有测试通过
- [ ] 性能指标达标
- [ ] 代码审查完成
- [ ] 文档更新
- [ ] 监控配置
- [ ] 回滚计划准备

### 监控指标

```typescript
// 关键监控指标
const metrics = {
  // 性能指标
  intentRecognitionLatency: 'p50, p95, p99',
  emotionAnalysisLatency: 'p50, p95, p99',
  contextBuildTime: 'p50, p95, p99',
  firstTokenTime: 'p50, p95, p99',
  
  // 质量指标
  intentAccuracy: 'daily',
  emotionAccuracy: 'daily',
  coherenceScore: 'daily',
  userSatisfaction: 'weekly',
  
  // 业务指标
  conversationLength: 'avg, median',
  completionRate: 'daily',
  errorRate: 'daily',
}
```

---

## 附录

### A. 类型定义完整列表

```typescript
// types.ts 扩展

export interface ConversationState {
  id: string
  phase: ConversationPhase
  topic: string
  subTopics: string[]
  turnCount: number
  coherenceScore: number
  lastIntent: Intent | null
  lastEmotion: Emotion | null
  contextWindow: ContextWindow | null
  metadata: Record<string, any>
}

export type ConversationPhase =
  | 'initiation'
  | 'exploration'
  | 'clarification'
  | 'resolution'
  | 'closing'

export interface Intent {
  type: IntentType
  confidence: number
  entities: Entity[]
  parameters: Record<string, any>
  history: Intent[]
}

export enum IntentType {
  // 查询类
  QUERY_WORKFLOW = 'query_workflow',
  QUERY_DATA = 'query_data',
  QUERY_STATUS = 'query_status',
  QUERY_HELP = 'query_help',
  
  // 执行类
  EXECUTE_WORKFLOW = 'execute_workflow',
  EXECUTE_CODE = 'execute_code',
  EXECUTE_ACTION = 'execute_action',
  
  // 管理类
  CREATE_WORKFLOW = 'create_workflow',
  EDIT_WORKFLOW = 'edit_workflow',
  DELETE_WORKFLOW = 'delete_workflow',
  
  // 交互类
  CLARIFICATION = 'clarification',
  CONFIRMATION = 'confirmation',
  NEGATION = 'negation',
  
  // 闲聊类
  GREETING = 'greeting',
  FAREWELL = 'farewell',
  CHITCHAT = 'chitchat',
  COMPLIMENT = 'compliment',
  COMPLAINT = 'complaint',
}

export interface Entity {
  type: string
  value: any
  confidence: number
}

export interface Emotion {
  type: EmotionType
  intensity: number
  confidence: number
  keywords: string[]
  trend: EmotionTrend
}

export enum EmotionType {
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative',
  FRUSTRATED = 'frustrated',
  EXCITED = 'excited',
  CONFUSED = 'confused',
  SATISFIED = 'satisfied',
  ANGRY = 'angry',
}

export type EmotionTrend = 'improving' | 'stable' | 'declining'

export enum ResponseStyle {
  EMPATHETIC = 'empathetic',
  CALM = 'calm',
  ENTHUSIASTIC = 'enthusiastic',
  REASSURING = 'reassuring',
  DIRECT = 'direct',
}

export interface ContextWindow {
  messages: AIMessage[]
  tokenCount: number
  strategy: 'recent' | 'summary' | 'hybrid'
}

export interface ConversationContext {
  conversationId: string
  systemPrompt?: string
  messages: AIMessage[]
  tokenCount: number
  intent?: Intent
  emotion?: Emotion
  maxTokens?: number
}
```

### B. 配置示例

```typescript
// config/ai-chat.config.ts
export const AI_CHAT_CONFIG = {
  // 意图识别配置
  intent: {
    cacheSize: 100,
    cacheTTL: 3600000, // 1 hour
    fallbackToRules: true,
    minConfidence: 0.7,
  },
  
  // 情感分析配置
  emotion: {
    useDictionaryFirst: true,
    modelConfidenceThreshold: 0.7,
    trendHistorySize: 5,
  },
  
  // 上下文窗口配置
  context: {
    maxTokens: 32000,
    defaultStrategy: 'hybrid',
    importanceWeights: {
      userMessage: 1.5,
      assistantMessage: 1.0,
      systemPrompt: 2.0,
      recentTurn: 2.0,
    },
  },
  
  // 对话状态配置
  state: {
    maxTurns: 50,
    coherenceThreshold: 0.7,
    autoArchiveAfter: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  
  // 性能配置
  performance: {
    intentTimeout: 200,
    emotionTimeout: 100,
    contextTimeout: 300,
    streamChunkSize: 150,
  },
}
```

### C. API 文档

#### POST /api/ai/conversation

增强型对话处理 API。

**请求体**:

```json
{
  "message": "创建一个定时工作流",
  "conversationId": "conv_123",
  "history": [
    {
      "id": "msg_1",
      "role": "user",
      "content": "你好",
      "timestamp": 1234567890
    },
    {
      "id": "msg_2",
      "role": "assistant",
      "content": "你好！有什么可以帮助你的？",
      "timestamp": 1234567891
    }
  ]
}
```

**响应体**:

```json
{
  "intent": {
    "type": "create_workflow",
    "confidence": 0.92,
    "entities": [],
    "parameters": {},
    "history": []
  },
  "emotion": {
    "type": "neutral",
    "intensity": 0.3,
    "confidence": 0.85,
    "keywords": [],
    "trend": "stable"
  },
  "context": {
    "conversationId": "conv_123",
    "messages": [],
    "tokenCount": 12500,
    "maxTokens": 32000
  },
  "suggestedResponse": "好的，我来帮你创建工作流。请告诉我触发条件。",
  "responseStyle": "direct"
}
```

---

## 总结

本架构设计文档详细描述了 7zi-frontend 项目 AI 对话系统的增强方案，包括：

1. **四大核心模块**:
   - ConversationStateManager: 对话状态管理
   - IntentRecognizer: 意图识别
   - EmotionAnalyzer: 情感分析
   - ContextWindowManager: 上下文窗口管理

2. **完整的技术实现**:
   - 前端组件和状态管理
   - 后端 API 和服务层
   - 数据流和交互流程

3. **性能优化策略**:
   - 缓存机制
   - 流式传输
   - 增量更新

4. **全面的测试方案**:
   - 单元测试
   - 集成测试
   - E2E 测试
   - 性能测试

5. **详细的部署计划**:
   - 6 周实施计划
   - 分阶段发布策略
   - 监控和回滚方案

通过实施本架构，预期将实现：
- 多轮对话连贯性从 ~2.5/5 提升至 >4.0/5
- 意图理解准确率从 ~65% 提升至 >90%
- 情感分析准确率达到 >85%
- 平均响应时间减少 25%

---

**文档版本**: v1.0
**最后更新**: 2025-04-04
**维护者**: 架构师团队