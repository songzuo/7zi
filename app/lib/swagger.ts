/**
 * Swagger/OpenAPI 文档配置
 */

import { createSwaggerSpec } from 'next-swagger-doc';

export interface SwaggerDefinition {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
    contact: {
      name: string;
      email: string;
    };
    license: {
      name: string;
      url: string;
    };
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  components: {
    securitySchemes: {
      bearerAuth: {
        type: string;
        scheme: string;
        bearerFormat: string;
      };
    };
    schemas: Record<string, {
      type: string;
      properties?: Record<string, unknown>;
      required?: string[];
    }>;
  };
  tags: Array<{
    name: string;
    description: string;
  }>;
}

export interface SwaggerOptions {
  definition: SwaggerDefinition;
  apiFolder: string;
}

export const swaggerOptions: SwaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Team Dashboard API',
      version: '1.0.0',
      description: 'AI 团队仪表盘 API 文档\n\n## 概述\n\n提供用户管理、任务管理、数据导出等功能的 RESTful API。\n\n## 认证\n\n部分 API 需要认证，请在请求头中添加 `Authorization: Bearer <token>`。',
      contact: {
        name: 'API Support',
        email: 'support@ai-team.example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: '/api',
        description: '当前服务器',
      },
      {
        url: 'https://ai-team-dashboard.vercel.app/api',
        description: '生产服务器',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: '用户唯一标识',
            },
            name: {
              type: 'string',
              description: '用户名称',
            },
            email: {
              type: 'string',
              format: 'email',
              description: '用户邮箱',
            },
            avatar: {
              type: 'string',
              description: '头像 URL',
            },
            bio: {
              type: 'string',
              description: '个人简介',
            },
            role: {
              type: 'string',
              enum: ['admin', 'member', 'guest'],
              description: '用户角色',
            },
            provider: {
              type: 'string',
              enum: ['email', 'google', 'github', 'wechat'],
              description: '登录提供商',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '创建时间',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: '更新时间',
            },
          },
          required: ['id', 'name', 'email'],
        },
        Task: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: '任务唯一标识',
            },
            title: {
              type: 'string',
              description: '任务标题',
            },
            description: {
              type: 'string',
              description: '任务描述',
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
              description: '优先级',
            },
            status: {
              type: 'string',
              enum: ['todo', 'in-progress', 'review', 'done', 'cancelled'],
              description: '任务状态',
            },
            tags: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: '标签列表',
            },
            assignee: {
              type: 'string',
              description: '负责人 ID',
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              description: '截止日期',
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
              description: '完成时间',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '创建时间',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: '更新时间',
            },
          },
          required: ['id', 'title', 'priority', 'status'],
        },
        Tag: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: '标签唯一标识',
            },
            name: {
              type: 'string',
              description: '标签名称',
            },
            color: {
              type: 'string',
              description: '标签颜色 (十六进制)',
            },
            count: {
              type: 'integer',
              description: '使用次数',
            },
          },
          required: ['id', 'name'],
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: '错误信息',
            },
          },
          required: ['error'],
        },
        HealthStatus: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['ok', 'error'],
              description: '健康状态',
            },
            database: {
              type: 'string',
              description: '数据库路径',
            },
            error: {
              type: 'string',
              description: '错误信息 (如果有)',
            },
          },
          required: ['status'],
        },
        TaskStats: {
          type: 'object',
          properties: {
            total: {
              type: 'integer',
              description: '总任务数',
            },
            completed: {
              type: 'integer',
              description: '已完成任务数',
            },
            inProgress: {
              type: 'integer',
              description: '进行中任务数',
            },
            todo: {
              type: 'integer',
              description: '待办任务数',
            },
            overdue: {
              type: 'integer',
              description: '逾期任务数',
            },
          },
          required: ['total', 'completed', 'inProgress', 'todo', 'overdue'],
        },
      },
    },
    tags: [
      {
        name: 'Users',
        description: '用户管理 API',
      },
      {
        name: 'Tasks',
        description: '任务管理 API',
      },
      {
        name: 'Tags',
        description: '标签管理 API',
      },
      {
        name: 'Dashboard',
        description: '仪表盘数据 API',
      },
      {
        name: 'Reports',
        description: '报告生成 API',
      },
      {
        name: 'Export',
        description: '数据导出 API',
      },
      {
        name: 'Health',
        description: '系统健康检查 API',
      },
    ],
  },
  apiFolder: 'app/api',
};

export async function getApiDocs(): Promise<SwaggerDefinition> {
  return createSwaggerSpec(swaggerOptions) as Promise<SwaggerDefinition>;
}