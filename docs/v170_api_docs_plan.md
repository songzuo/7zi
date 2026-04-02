# 7zi 项目 v1.7.0 API 文档自动生成方案

**版本**: v1.7.0
**制定日期**: 2026-04-02
**制定人**: 📚 咨询师（研究分析专家）
**技术栈**: Next.js 16.2.1, React 19

---

## 📋 目录

1. [项目现状分析](#项目现状分析)
2. [技术选型](#技术选型)
3. [API 注解规范](#api-注解规范)
4. [文档托管方案](#文档托管方案)
5. [实施步骤](#实施步骤)
6. [实现代码示例](#实现代码示例)
7. [CI/CD 集成](#cicd-集成)
8. [维护与更新](#维护与更新)

---

## 项目现状分析

### 现有 API 结构

```
src/app/api/
├── analytics/          # 分析 API
│   └── export/
├── database/           # 数据库 API
│   ├── health/
│   └── optimize/
├── multimodal/         # 多模态 API
│   ├── audio/
│   └── image/
├── stream/             # 流式 API
│   ├── health/
│   └── analytics/
└── ... (其他 60+ 端点)
```

**统计**:

- API 端点总数: 65+ 个
- 已有 `@openapi` 注释: 部分端点
- 现有文档: `docs/API.md` (手工维护, 3000+ 行)
- OpenAPI 规范: `docs/v150-openapi.yaml` (v1.5.0, 需更新)

### 现有依赖

```json
{
  "dependencies": {
    "next": "16.2.1",
    "react": "19.0.0"
  }
}
```

**缺失**:

- ❌ swagger-ui-react
- ❌ @apidevtools/swagger-cli
- ❌ openapi-types
- ❌ 自动化文档生成工具

### 代码示例分析

已发现的 `@openapi` 注释格式：

```typescript
/**
 * @openapi
 * /api/stream/health:
 *   get:
 *     summary: Stream health metrics via SSE
 *     description: Real-time health monitoring using Server-Sent Events
 *     tags:
 *       - Monitoring
 *       - Stream
 *     responses:
 *       200:
 *         description: SSE stream established successfully
 */
```

**问题**:

- ⚠️ 注释不完整（缺少 `requestBody`, `parameters`, `components`）
- ⚠️ 没有统一的验证逻辑
- ⚠️ 手工维护 `docs/API.md` 与代码不同步

---

## 技术选型

### 推荐：基于 Next.js 原生 App Router + OpenAPI 3.0

**方案架构**:

```
src/
├── app/
│   ├── api/
│   │   ├── **/route.ts              # API 路由（含 JSDoc 注释）
│   │   └── docs/
│   │       └── route.ts             # Swagger UI 页面
│   └── _components/
│       └── SwaggerUI.tsx            # Swagger UI 组件
├── lib/
│   ├── openapi/
│   │   ├── generator.ts            # OpenAPI 规范生成器
│   │   ├── parser.ts                # JSDoc 解析器
│   │   ├── validator.ts             # API 注解验证
│   │   └── schema.ts                # 通用 Schema 定义
│   └── types/
│       └── openapi.ts               # OpenAPI 类型定义
├── scripts/
│   ├── generate-openapi.js          # 生成 OpenAPI 规范
│   └── validate-api-docs.js         # 验证 API 注解
└── docs/
    ├── api/                         # 自动生成的 API 文档
    │   ├── openapi.yaml             # OpenAPI 3.0 规范
    │   └── openapi.json             # OpenAPI 3.0 JSON
    └── API.md                       # 保留用于手工补充说明
```

### 技术栈对比

| 工具                   | 优点                      | 缺点                  | 推荐度     |
| ---------------------- | ------------------------- | --------------------- | ---------- |
| **Swagger UI (react)** | 成熟、社区支持好、UI 美观 | 需要维护 OpenAPI 规范 | ⭐⭐⭐⭐⭐ |
| **Stoplight**          | 可视化设计、更现代        | 学习成本高、额外服务  | ⭐⭐⭐     |
| **Redoc**              | UI 美观、响应式           | 定制能力有限          | ⭐⭐⭐     |
| **Auto-Swagger**       | 自动生成、零配置          | 不稳定、维护困难      | ⭐⭐       |

**最终选择**: **Swagger UI + JSDoc 自动生成**

### 核心依赖

```json
{
  "dependencies": {
    "swagger-ui-react": "^5.12.0",
    "openapi-types": "^12.1.3",
    "swagger-client": "^3.27.1"
  },
  "devDependencies": {
    "@apidevtools/swagger-cli": "^4.0.4",
    "@types/swagger-ui-react": "^4.18.3",
    "jsdoc-to-markdown": "^8.0.1",
    "glob": "^10.3.10"
  }
}
```

---

## API 注解规范

### 统一注解模板

```typescript
/**
 * @openapi
 * /api/{endpoint}:
 *   {method}:
 *     summary: {简短描述}
 *     description: |
 *       {详细描述}
 *
 *       ### 功能说明
 *       - {要点 1}
 *       - {要点 2}
 *
 *       ### 权限要求
 *       - 需要认证: {true/false}
 *       - 需要权限: {权限列表}
 *     tags:
 *       - {分类 1}
 *       - {分类 2}
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: {path/query/header/cookie}
 *         name: {参数名}
 *         required: {true/false}
 *         schema:
 *           type: {string/number/boolean/array/object}
 *           format: {格式}
 *         description: {参数描述}
 *     requestBody:
 *       required: {true/false}
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               {字段名}:
 *                 type: {类型}
 *                 description: {描述}
 *             required: [{必填字段}]
 *     responses:
 *       200:
 *         description: 请求成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 未授权
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
```

### 实际示例

```typescript
/**
 * @openapi
 * /api/analytics/export:
 *   post:
 *     summary: Export analytics data in various formats
 *     description: |
 *       Export analytics data in CSV, Excel, or JSON format.
 *
 *       ### Supported Formats
 *       - **CSV**: Comma-separated values with headers
 *       - **Excel**: .xlsx with auto-fit columns
 *       - **JSON**: Pretty-printed JSON structure
 *
 *       ### Rate Limiting
 *       - Max 10 exports per minute per user
 *       - Max 10,000 records per export
 *     tags:
 *       - Analytics
 *       - Export
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               format:
 *                 type: string
 *                 enum: [csv, xlsx, json]
 *                 default: csv
 *                 description: Export format
 *               data:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Analytics data to export
 *               filename:
 *                 type: string
 *                 default: analytics-export
 *                 description: Base filename (timestamp will be appended)
 *               includeHeaders:
 *                 type: boolean
 *                 default: true
 *                 description: Include column headers
 *               dateRange:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                     format: date-time
 *                   end:
 *                     type: string
 *                     format: date-time
 *                 description: Optional date range filter
 *             required: [format, data]
 *     responses:
 *       200:
 *         description: Export successful
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Invalid request or export format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   get:
 *     summary: Get export options and supported formats
 *     description: Returns available export formats and options
 *     tags:
 *       - Analytics
 *       - Export
 *     responses:
 *       200:
 *         description: Export options
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     formats:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["csv", "xlsx", "json"]
 *                     maxRecords:
 *                       type: integer
 *                       example: 10000
 *                     options:
 *                       type: object
 *                       properties:
 *                         includeHeaders:
 *                           type: array
 *                           items:
 *                             type: string
 *                         timeRange:
 *                           type: array
 *                           items:
 *                             type: string
 */
export async function POST(request: NextRequest) {
  // ... 实现代码
}
```

### 通用 Schema 定义

```typescript
/**
 * @openapi
 * components:
 *   schemas:
 *     SuccessResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *         timestamp:
 *           type: string
 *           format: date-time
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               enum: [VALIDATION_ERROR, AUTHENTICATION_ERROR, AUTHORIZATION_ERROR, NOT_FOUND, INTERNAL_ERROR]
 *             code:
 *               type: string
 *             message:
 *               type: string
 *             details:
 *               type: object
 *             timestamp:
 *               type: string
 *               format: date-time
 *     PaginationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             items:
 *               type: array
 *               items:
 *                 type: object
 *             total:
 *               type: integer
 *             page:
 *               type: integer
 *             pageSize:
 *               type: integer
 *             totalPages:
 *               type: integer
 *         timestamp:
 *           type: string
 *           format: date-time
 */
```

---

## 文档托管方案

### 方案 1: Next.js 原生集成（推荐）

**路径**: `/api/docs`

**实现**:

```typescript
// src/app/api/docs/route.ts
import { NextResponse } from 'next/server';
import { generateOpenAPISpec } from '@/lib/openapi/generator';

export async function GET() {
  const spec = await generateOpenAPISpec();
  return NextResponse.json(spec);
}

// src/app/docs/page.tsx
'use client';

import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function APIDocs() {
  return (
    <div className="api-docs">
      <SwaggerUI url="/api/docs" />
    </div>
  );
}
```

**优点**:

- ✅ 与现有路由系统集成
- ✅ 无需额外服务器
- ✅ 自动应用认证逻辑
- ✅ 支持多语言

### 方案 2: 静态生成（备选）

**生成时机**: 构建时

**输出**:

```
docs/api/
├── openapi.yaml      # OpenAPI 规范
├── openapi.json      # OpenAPI JSON
└── index.html        # Swagger UI 静态页面
```

**优点**:

- ✅ 文档可独立部署
- ✅ 版本控制友好
- ✅ CDN 加速支持

### 推荐部署架构

```
生产环境:
  /api/docs          → 动态生成（最新）
  /api/docs/v1.7.0   → 静态版本（发布时锁定）

开发环境:
  /api/docs          → 实时预览
```

---

## 实施步骤

### 阶段 1: 基础设施搭建（1-2 天）

**任务清单**:

- [ ] 安装依赖

  ```bash
  npm install swagger-ui-react openapi-types swagger-client
  npm install -D @apidevtools/swagger-cli @types/swagger-ui-react jsdoc-to-markdown glob
  ```

- [ ] 创建目录结构

  ```bash
  mkdir -p src/lib/openapi
  mkdir -p src/lib/types
  mkdir -p src/app/api/docs
  mkdir -p scripts
  ```

- [ ] 创建类型定义
  - `src/lib/types/openapi.ts` - OpenAPI 类型

- [ ] 创建 OpenAPI 生成器
  - `src/lib/openapi/generator.ts` - 核心生成器
  - `src/lib/openapi/parser.ts` - JSDoc 解析器
  - `src/lib/openapi/validator.ts` - 验证工具

### 阶段 2: API 注解标准化（3-5 天）

**任务清单**:

- [ ] 为所有 65+ API 端点添加 `@openapi` 注解
- [ ] 定义通用 Schema（SuccessResponse, ErrorResponse, PaginationResponse）
- [ ] 验证所有注解的完整性
- [ ] 生成第一个 OpenAPI 规范

**优先级**:

1. **P0** (核心 API): Auth, Tasks, Projects, Agents
2. **P1** (重要 API): Analytics, RBAC, Multimodal
3. **P2** (辅助 API): Health, Demo, Vitals

### 阶段 3: 文档集成（2-3 天）

**任务清单**:

- [ ] 实现 `/api/docs` 路由
- [ ] 实现 `/docs` 页面
- [ ] 配置 Swagger UI 主题
- [ ] 添加认证支持（JWT Bearer）
- [ ] 配置多语言支持

### 阶段 4: 自动化与 CI/CD（2 天）

**任务清单**:

- [ ] 创建 `scripts/generate-openapi.js`
- [ ] 创建 `scripts/validate-api-docs.js`
- [ ] 配置 pre-commit 钩子
- [ ] 配置 CI pipeline

### 阶段 5: 测试与优化（1-2 天）

**任务清单**:

- [ ] 测试所有 API 文档
- [ ] 性能优化（缓存、压缩）
- [ ] 用户体验优化
- [ ] 文档审查与发布

---

## 实现代码示例

### 1. 类型定义 (`src/lib/types/openapi.ts`)

```typescript
/**
 * OpenAPI 3.0 Type Definitions
 */

export interface OpenAPISpec {
  openapi: string
  info: OpenAPIInfo
  servers?: OpenAPIServer[]
  tags?: OpenAPITag[]
  paths: OpenAPIPaths
  components?: OpenAPIComponents
}

export interface OpenAPIInfo {
  title: string
  description?: string
  version: string
  contact?: OpenAPIContact
  license?: OpenAPILicense
}

export interface OpenAPIServer {
  url: string
  description?: string
  variables?: Record<string, OpenAPIServerVariable>
}

export interface OpenAPITag {
  name: string
  description?: string
}

export interface OpenAPIPaths {
  [path: string]: OpenAPIPathItem
}

export interface OpenAPIPathItem {
  get?: OpenAPIOperation
  post?: OpenAPIOperation
  put?: OpenAPIOperation
  delete?: OpenAPIOperation
  patch?: OpenAPIOperation
}

export interface OpenAPIOperation {
  tags?: string[]
  summary?: string
  description?: string
  operationId?: string
  parameters?: OpenAPIParameter[]
  requestBody?: OpenAPIRequestBody
  responses: OpenAPIResponses
  security?: OpenAPISecurityRequirement[]
  deprecated?: boolean
}

export interface OpenAPIParameter {
  name: string
  in: 'path' | 'query' | 'header' | 'cookie'
  description?: string
  required?: boolean
  schema: OpenAPISchema
}

export interface OpenAPIRequestBody {
  description?: string
  content: OpenAPIContent
  required?: boolean
}

export interface OpenAPIContent {
  [mediaType: string]: OpenAPIMediaType
}

export interface OpenAPIMediaType {
  schema?: OpenAPISchema
  example?: unknown
}

export interface OpenAPIResponses {
  [statusCode: string]: OpenAPIResponse
}

export interface OpenAPIResponse {
  description: string
  headers?: Record<string, OpenAPIHeader>
  content?: OpenAPIContent
}

export interface OpenAPISchema {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object'
  format?: string
  description?: string
  enum?: (string | number)[]
  default?: unknown
  example?: unknown
  items?: OpenAPISchema
  properties?: Record<string, OpenAPISchema>
  required?: string[]
  $ref?: string
  allOf?: OpenAPISchema[]
  anyOf?: OpenAPISchema[]
  oneOf?: OpenAPISchema[]
}

export interface OpenAPIComponents {
  schemas?: Record<string, OpenAPISchema>
  responses?: Record<string, OpenAPIResponse>
  parameters?: Record<string, OpenAPIParameter>
  requestBodies?: Record<string, OpenAPIRequestBody>
  securitySchemes?: Record<string, OpenAPISecurityScheme>
}

export interface OpenAPISecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect'
  description?: string
  name?: string
  in?: 'query' | 'header' | 'cookie'
  scheme?: string
  bearerFormat?: string
}

export interface OpenAPISecurityRequirement {
  [name: string]: string[]
}
```

### 2. OpenAPI 生成器 (`src/lib/openapi/generator.ts`)

```typescript
/**
 * OpenAPI 3.0 Specification Generator
 *
 * Scans all API routes and generates OpenAPI specification from JSDoc annotations.
 */

import { glob } from 'glob'
import fs from 'fs/promises'
import type { OpenAPISpec } from '@/lib/types/openapi'
import { parseJSDocAnnotations } from './parser'
import { logger } from '@/lib/logger'

/**
 * OpenAPI specification template
 */
function createBaseSpec(): OpenAPISpec {
  return {
    openapi: '3.0.3',
    info: {
      title: '7zi API',
      description: `
# 7zi - AI 驱动的团队管理平台 API

11 位 AI 成员 · 24/7 自主工作 · 实时协作

## 认证方式
所有 API 请求需要在 Header 中携带 JWT Token:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## 错误响应格式
所有错误响应遵循统一格式:
\`\`\`json
{
  "success": false,
  "error": {
    "type": "ERROR_TYPE",
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": {}
  }
}
\`\`\`

## 限流策略
- 默认限制: 100 请求/分钟/IP
- 认证用户: 200 请求/分钟/用户
- API Key 用户: 500 请求/分钟
      `,
      version: '1.7.0',
      contact: {
        name: '7zi API Support',
        email: 'api@7zi.com',
        url: 'https://7zi.com/docs/api',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_API_URL || 'https://7zi.com/api',
        description: '生产环境',
      },
      {
        url: 'http://localhost:3000/api',
        description: '开发环境',
      },
    ],
    tags: [],
    paths: {},
    components: {
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: [
                    'VALIDATION_ERROR',
                    'AUTHENTICATION_ERROR',
                    'AUTHORIZATION_ERROR',
                    'NOT_FOUND',
                    'INTERNAL_ERROR',
                  ],
                },
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'object' },
                timestamp: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        PaginationResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                items: { type: 'array', items: { type: 'object' } },
                total: { type: 'integer' },
                page: { type: 'integer' },
                pageSize: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT 认证令牌',
        },
      },
    },
  }
}

/**
 * Scan all API routes and collect annotations
 */
async function scanApiRoutes(): Promise<Record<string, unknown>> {
  const apiFiles = await glob('src/app/api/**/route.ts', {
    cwd: process.cwd(),
  })

  const allAnnotations: Record<string, unknown> = {}

  for (const file of apiFiles) {
    try {
      const content = await fs.readFile(file, 'utf-8')
      const annotations = parseJSDocAnnotations(content)

      // Merge paths
      if (annotations.paths) {
        Object.assign(allAnnotations.paths || {}, annotations.paths)
      }

      // Merge components
      if (annotations.components) {
        Object.assign(allAnnotations.components || {}, annotations.components)
      }
    } catch (error) {
      logger.warn(`Failed to parse ${file}`, { error })
    }
  }

  return allAnnotations
}

/**
 * Generate complete OpenAPI specification
 */
export async function generateOpenAPISpec(): Promise<OpenAPISpec> {
  logger.info('Generating OpenAPI specification...')

  const spec = createBaseSpec()
  const annotations = await scanApiRoutes()

  // Merge paths
  if (annotations.paths) {
    spec.paths = { ...spec.paths, ...(annotations.paths as Record<string, unknown>) }
  }

  // Extract and add tags
  const tags = new Set<string>()
  Object.values(spec.paths).forEach(pathItem => {
    Object.values(pathItem as Record<string, unknown>).forEach(operation => {
      if (typeof operation === 'object' && operation !== null && 'tags' in operation) {
        const opTags = (operation as { tags?: string[] }).tags
        if (Array.isArray(opTags)) {
          opTags.forEach(tag => tags.add(tag))
        }
      }
    })
  })

  spec.tags = Array.from(tags).map(tag => ({
    name: tag,
    description: `${tag} related endpoints`,
  }))

  // Merge components
  if (annotations.components) {
    spec.components!.schemas = {
      ...spec.components!.schemas,
      ...((annotations.components as { schemas?: Record<string, unknown> }).schemas || {}),
    }
  }

  logger.info('OpenAPI specification generated', {
    paths: Object.keys(spec.paths).length,
    tags: spec.tags?.length || 0,
  })

  return spec
}

/**
 * Generate OpenAPI spec and write to files
 */
export async function generateOpenAPISpecFiles(outputPath: string = 'docs/api'): Promise<void> {
  const spec = await generateOpenAPISpec()

  // Ensure directory exists
  await fs.mkdir(outputPath, { recursive: true })

  // Write JSON (YAML requires js-yaml package)
  await fs.writeFile(`${outputPath}/openapi.json`, JSON.stringify(spec, null, 2))

  logger.info(`OpenAPI spec written to ${outputPath}/openapi.json`)
}
```

### 3. JSDoc 解析器 (`src/lib/openapi/parser.ts`)

```typescript
/**
 * JSDoc Annotation Parser
 *
 * Parses @openapi annotations from TypeScript source files.
 */

import yaml from 'js-yaml'
import { logger } from '@/lib/logger'

/**
 * Parse JSDoc @openapi annotations from source code
 */
export function parseJSDocAnnotations(sourceCode: string): Record<string, unknown> {
  const annotations: Record<string, unknown> = {
    paths: {},
    components: {},
  }

  // Find all @openapi blocks
  const openapiBlocks = extractOpenAPIDocBlocks(sourceCode)

  // Parse each block
  for (const block of openapiBlocks) {
    try {
      const parsed = parseOpenAPIBlock(block)
      if (parsed) {
        // Merge paths
        if (parsed.paths) {
          Object.assign(annotations.paths, parsed.paths)
        }
        // Merge components
        if (parsed.components) {
          Object.assign(annotations.components, parsed.components)
        }
      }
    } catch (error) {
      logger.warn('Failed to parse @openapi block', { error })
    }
  }

  return annotations
}

/**
 * Extract @openapi documentation blocks
 */
function extractOpenAPIDocBlocks(sourceCode: string): string[] {
  const blocks: string[] = []
  const regex = /\/\*\*[\s\S]*?\*\//g
  let match

  while ((match = regex.exec(sourceCode)) !== null) {
    const block = match[0]
    if (block.includes('@openapi')) {
      blocks.push(block)
    }
  }

  return blocks
}

/**
 * Parse a single @openapi block
 */
function parseOpenAPIBlock(block: string): Record<string, unknown> | null {
  try {
    // Remove comment markers
    const content = block
      .replace(/\/\*\*\s*\n?/, '')
      .replace(/\s*\*\//, '')
      .split('\n')
      .map(line => line.replace(/^\s*\*\s?/, '').trim())
      .filter(line => !line.startsWith('@')) // Remove other JSDoc tags
      .join('\n')

    // Parse as YAML
    const parsed = yaml.load(content) as Record<string, unknown>
    return parsed
  } catch (error) {
    logger.warn('Failed to parse @openapi block', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}
```

### 4. API 文档路由 (`src/app/api/docs/route.ts`)

```typescript
/**
 * OpenAPI Documentation Endpoint
 *
 * Serves the OpenAPI specification as JSON
 */

import { NextResponse } from 'next/server'
import { generateOpenAPISpec } from '@/lib/openapi/generator'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // Cache for 1 hour

/**
 * GET /api/docs
 * Returns OpenAPI specification
 */
export async function GET() {
  try {
    const spec = await generateOpenAPISpec()

    return NextResponse.json(spec, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate OpenAPI specification' }, { status: 500 })
  }
}
```

### 5. Swagger UI 页面 (`src/app/docs/page.tsx`)

```typescript
'use client';

/**
 * API Documentation Page
 *
 * Interactive Swagger UI for API exploration
 */

import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function APIDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">API Documentation</h1>
          <p className="text-muted-foreground mt-2">
            Interactive API documentation for 7zi platform
          </p>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <SwaggerUI
            url="/api/docs"
            docExpansion="list"
            deepLinking={true}
            displayOperationId={false}
            defaultModelsExpandDepth={1}
            defaultModelExpandDepth={1}
          />
        </div>
      </div>
    </div>
  );
}
```

### 6. 生成脚本 (`scripts/generate-openapi.js`)

```javascript
#!/usr/bin/env node

/**
 * OpenAPI Specification Generator Script
 *
 * Usage:
 *   node scripts/generate-openapi.js
 *   node scripts/generate-openapi.js --output docs/api
 *   node scripts/generate-openapi.js --validate
 */

const { generateOpenAPISpecFiles } = require('../src/lib/openapi/generator')
const { validateOpenAPISpec } = require('../src/lib/openapi/validator')
const fs = require('fs')
const path = require('path')

async function main() {
  const args = process.argv.slice(2)
  const outputDir = args.includes('--output') ? args[args.indexOf('--output') + 1] : 'docs/api'
  const shouldValidate = args.includes('--validate')

  console.log('🚀 Generating OpenAPI specification...')
  console.log(`   Output: ${outputDir}`)

  try {
    // Generate spec files
    await generateOpenAPISpecFiles(outputDir)

    if (shouldValidate) {
      console.log('🔍 Validating OpenAPI specification...')

      const specPath = path.join(outputDir, 'openapi.json')
      const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'))

      const validation = validateOpenAPISpec(spec)

      if (validation.valid) {
        console.log('✅ OpenAPI specification is valid')
      } else {
        console.error('❌ OpenAPI specification has errors:')
        validation.errors.forEach(err => {
          console.error(`   - ${err.message}`)
        })
        process.exit(1)
      }
    }

    console.log('✨ Done!')
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()
```

---

## CI/CD 集成

### GitHub Actions Workflow

```yaml
# .github/workflows/api-docs.yml
name: API Documentation

on:
  push:
    branches: [main, develop]
    paths:
      - 'src/app/api/**'
      - 'src/lib/openapi/**'
  pull_request:
    branches: [main]
    paths:
      - 'src/app/api/**'

jobs:
  generate-and-validate:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate OpenAPI spec
        run: node scripts/generate-openapi.js --validate

      - name: Upload OpenAPI spec
        uses: actions/upload-artifact@v4
        with:
          name: openapi-spec
          path: docs/api/

      - name: Comment PR with spec changes
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const spec = JSON.parse(fs.readFileSync('docs/api/openapi.json', 'utf-8'));

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## 📚 API Documentation Updated\n\n**Endpoints:** ${Object.keys(spec.paths).length}\n**Tags:** ${spec.tags?.length || 0}\n\nView the full spec in the build artifacts.`
            });
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "🔍 Checking API documentation..."

# Check if API files changed
API_CHANGED=$(git diff --cached --name-only | grep -c "src/app/api/")

if [ "$API_CHANGED" -gt 0 ]; then
  echo "📝 API files changed, regenerating documentation..."
  node scripts/generate-openapi.js --validate

  if [ $? -ne 0 ]; then
    echo "❌ API documentation validation failed"
    exit 1
  fi

  # Add generated files to commit
  git add docs/api/
fi

exit 0
```

---

## 维护与更新

### 文档同步策略

1. **自动同步**:
   - ✅ CI/CD 自动生成和验证
   - ✅ Pre-commit 钩子确保本地一致

2. **手动更新**:
   - 开发新 API 时，必须添加 `@openapi` 注释
   - 使用统一模板确保完整性
   - 提交前运行 `npm run docs:validate`

### 版本管理

```
docs/api/
├── v1.5.0/
│   └── openapi.json     # 锁定的历史版本
├── v1.6.0/
│   └── openapi.json
├── v1.7.0/
│   └── openapi.json     # 当前版本
└── openapi.json         # 最新（开发中）
```

### 常用命令

```bash
# 生成 OpenAPI 规范
npm run docs:generate

# 验证 API 注解
npm run docs:validate

# 启动文档开发服务器
npm run docs:dev

# 发布文档
npm run docs:publish
```

### Package.json Scripts

```json
{
  "scripts": {
    "docs:generate": "node scripts/generate-openapi.js",
    "docs:validate": "node scripts/generate-openapi.js --validate",
    "docs:dev": "next dev",
    "docs:build": "next build"
  }
}
```

---

## 总结

### 方案优势

1. **代码与文档同步** ✅
   - API 注解直接写在源代码中
   - 每次修改代码时，文档自动更新
   - 避免"文档过时"问题

2. **开发体验优秀** ✅
   - JSDoc 注释格式，IDE 支持良好
   - 无需维护独立的 YAML 文件
   - 类型安全，错误提示及时

3. **与 Next.js 无缝集成** ✅
   - 利用 Next.js App Router 路由系统
   - 支持动态生成和静态导出
   - 与现有认证系统无缝对接

4. **自动化程度高** ✅
   - CI/CD 自动生成和验证
   - Pre-commit 钩子保证质量
   - 减少人工维护成本

5. **扩展性强** ✅
   - 支持多版本文档管理
   - 可扩展为 API 测试工具
   - 支持多语言国际化

### 预计工作量

| 阶段     | 工作内容                  | 预计时间    | 负责人     |
| -------- | ------------------------- | ----------- | ---------- |
| 阶段 1   | 基础设施搭建              | 1-2 天      | Executor   |
| 阶段 2   | API 注解标准化 (65+ 端点) | 3-5 天      | Executor   |
| 阶段 3   | 文档集成                  | 2-3 天      | 架构师     |
| 阶段 4   | 自动化与 CI/CD            | 2 天        | 系统管理员 |
| 阶段 5   | 测试与优化                | 1-2 天      | 测试员     |
| **总计** |                           | **9-14 天** |            |

### 下一步行动

1. **立即执行**:
   - 安装所需依赖
   - 创建目录结构
   - 实现核心生成器

2. **本周完成**:
   - 为 P0 级别 API（Auth, Tasks, Projects, Agents）添加注解
   - 实现基础 Swagger UI 页面
   - 配置简单的验证脚本

3. **下周计划**:
   - 完成剩余 API 注解
   - 配置 CI/CD 流程
   - 测试和发布

### 风险与应对

| 风险           | 可能性 | 影响 | 应对措施               |
| -------------- | ------ | ---- | ---------------------- |
| JSDoc 解析复杂 | 中     | 中   | 使用成熟的 js-yaml 库  |
| 注解格式不统一 | 高     | 低   | 提供模板和 Lint 规则   |
| 性能问题       | 低     | 中   | 缓存生成结果，增量更新 |
| 团队接受度     | 中     | 中   | 培训和文档支持         |

---

**方案制定完成**

_本方案由 📚 咨询师（研究分析专家）制定，已充分考虑与现有技术栈的兼容性和团队的实际需求。如需调整或有疑问，请及时反馈。_
