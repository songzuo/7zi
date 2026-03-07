/**
 * AI 团队实时展示系统 - 后端服务
 * 
 * 技术栈: Node.js + Express + Socket.IO + Redis
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import Redis from 'ioredis';
import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// 配置
// ============================================================================

const config = {
  port: process.env.PORT || 4000,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  githubToken: process.env.GITHUB_TOKEN || '',
  githubRepo: process.env.GITHUB_REPO || 'owner/repo',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
};

// ============================================================================
// 初始化
// ============================================================================

// Express 应用
const app = express();
const httpServer = createServer(app);

// Socket.IO
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.frontendUrl,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

// Redis 客户端
const redis = new Redis(config.redisUrl);

// GitHub Octokit
const octokit = new Octokit({
  auth: config.githubToken
});

const [githubOwner, githubRepo] = config.githubRepo.split('/');

// ============================================================================
// 中间件
// ============================================================================

// CORS
app.use(cors({
  origin: config.frontendUrl,
  credentials: true
}));

// JSON 解析
app.use(express.json());

// 日志
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// 速率限制
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: 100, // 每分钟 100 次
  message: { error: 'Too many requests', retryAfter: 60 },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// ============================================================================
// 缓存工具
// ============================================================================

const CACHE_TTL = {
  ISSUES_LIST: 300,      // 5 分钟
  ISSUES_DETAIL: 600,    // 10 分钟
  MEMBERS_LIST: 180,     // 3 分钟
  MEMBERS_STATUS: 60,    // 1 分钟
  SYSTEM_STATS: 30       // 30 秒
};

async function getCached<T>(key: string, fetchFn: () => Promise<T>, ttl: number): Promise<T> {
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  const data = await fetchFn();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}

async function invalidateCache(pattern: string) {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

// ============================================================================
// REST API 路由
// ============================================================================

const apiRouter = express.Router();

// --------------------------------------------------------------------------
// 健康检查
// --------------------------------------------------------------------------

apiRouter.get('/health', async (req, res) => {
  const startTime = Date.now();
  
  const checks = await Promise.allSettled([
    redis.ping(),
    octokit.rest.repos.get({ owner: githubOwner, repo: githubRepo })
  ]);

  const services = {
    github: checks[1].status === 'fulfilled' 
      ? { status: 'ok', latency: Date.now() - startTime }
      : { status: 'error', error: checks[1].reason?.message },
    redis: checks[0].status === 'fulfilled'
      ? { status: 'ok', latency: Date.now() - startTime }
      : { status: 'error', error: checks[0].reason?.message }
  };

  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    version: '1.0.0',
    services,
    stats: {
      issues: 0, // 从缓存获取
      members: 11,
      websocketConnections: io.engine.clientsCount
    }
  });
});

// --------------------------------------------------------------------------
// 获取 Issues
// --------------------------------------------------------------------------

apiRouter.get('/issues', async (req, res) => {
  try {
    const {
      state = 'open',
      assignee,
      labels,
      milestone,
      page = 1,
      limit = 20,
      sort = 'updated',
      direction = 'desc'
    } = req.query;

    const cacheKey = `issues:${githubOwner}:${githubRepo}:${JSON.stringify(req.query)}`;

    const issues = await getCached(
      cacheKey,
      async () => {
        const { data } = await octokit.rest.issues.listForRepo({
          owner: githubOwner,
          repo: githubRepo,
          state: state as any,
          assignee: assignee as string,
          labels: labels as string,
          milestone: milestone as unknown as number,
          sort: sort as any,
          direction: direction as any,
          per_page: Number(limit),
          page: Number(page)
        });

        return data.map(issue => ({
          id: issue.id,
          number: issue.number,
          title: issue.title,
          state: issue.state,
          labels: issue.labels.map(label => ({
            id: label.id,
            name: label.name,
            color: label.color
          })),
          assignee: issue.assignee ? {
            id: issue.assignee.login,
            name: issue.assignee.login,
            avatar: issue.assignee.avatar_url
          } : null,
          created_at: issue.created_at,
          updated_at: issue.updated_at,
          closed_at: issue.closed_at,
          html_url: issue.html_url,
          milestone: issue.milestone ? {
            id: issue.milestone.id,
            title: issue.milestone.title,
            due_on: issue.milestone.due_on
          } : null,
          comments: issue.comments
        }));
      },
      CACHE_TTL.ISSUES_LIST
    );

    // 获取总数
    const { data: repoData } = await octokit.rest.repos.get({
      owner: githubOwner,
      repo: githubRepo
    });

    res.json({
      data: issues,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: repoData.open_issues,
        totalPages: Math.ceil(repoData.open_issues / Number(limit))
      },
      cached: true
    });
  } catch (error) {
    console.error('Error fetching issues:', error);
    res.status(500).json({
      error: 'Failed to fetch issues',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// --------------------------------------------------------------------------
// 获取单个 Issue
// --------------------------------------------------------------------------

apiRouter.get('/issues/:number', async (req, res) => {
  try {
    const { number } = req.params;
    const cacheKey = `issue:${githubOwner}:${githubRepo}:${number}`;

    const issue = await getCached(
      cacheKey,
      async () => {
        const { data } = await octokit.rest.issues.get({
          owner: githubOwner,
          repo: githubRepo,
          issue_number: Number(number)
        });

        // 获取评论
        const { data: comments } = await octokit.rest.issues.listComments({
          owner: githubOwner,
          repo: githubRepo,
          issue_number: Number(number)
        });

        return {
          ...data,
          comments: comments.map(c => ({
            id: c.id,
            user: { name: c.user?.login },
            body: c.body,
            created_at: c.created_at
          }))
        };
      },
      CACHE_TTL.ISSUES_DETAIL
    );

    res.json({ data: issue });
  } catch (error) {
    console.error('Error fetching issue:', error);
    res.status(500).json({
      error: 'Failed to fetch issue',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// --------------------------------------------------------------------------
// 获取 AI 成员列表
// --------------------------------------------------------------------------

apiRouter.get('/members', async (req, res) => {
  try {
    const cacheKey = `members:${githubOwner}:${githubRepo}`;

    const members = await getCached(
      cacheKey,
      async () => {
        // AI 成员列表 (硬编码，实际应从数据库获取)
        const aiMembers = [
          { id: 'agent-world', name: '智能体世界专家', role: '🌟 视角转换/未来布局', provider: 'minimax' },
          { id: 'consultant', name: '咨询师', role: '📚 研究分析', provider: 'minimax' },
          { id: 'architect', name: '架构师', role: '🏗️ 架构设计', provider: 'self-claude' },
          { id: 'executor', name: 'Executor', role: '⚡ 执行实现', provider: 'volcengine' },
          { id: 'sysadmin', name: '系统管理员', role: '🛡️ 运维部署', provider: 'bailian' },
          { id: 'tester', name: '测试员', role: '🧪 测试调试', provider: 'minimax' },
          { id: 'designer', name: '设计师', role: '🎨 UI 设计', provider: 'self-claude' },
          { id: 'promoter', name: '推广专员', role: '📣 推广 SEO', provider: 'volcengine' },
          { id: 'sales', name: '销售客服', role: '💼 销售客服', provider: 'bailian' },
          { id: 'finance', name: '财务', role: '💰 财务会计', provider: 'minimax' },
          { id: 'media', name: '媒体', role: '📺 媒体宣传', provider: 'self-claude' }
        ];

        // 获取每个成员的状态
        const membersWithStatus = await Promise.all(
          aiMembers.map(async (member) => {
            const statusKey = `member:${member.id}:status`;
            const cachedStatus = await redis.get(statusKey);
            
            // 获取成员当前任务
            const { data: issues } = await octokit.rest.issues.listForRepo({
              owner: githubOwner,
              repo: githubRepo,
              assignee: member.id,
              state: 'open',
              per_page: 1
            });

            return {
              ...member,
              avatar: `/avatars/${member.id}.png`,
              status: cachedStatus ? JSON.parse(cachedStatus).status : 'idle',
              statusMessage: cachedStatus ? JSON.parse(cachedStatus).message : undefined,
              currentTask: issues.length > 0 ? {
                number: issues[0].number,
                title: issues[0].title
              } : null,
              skills: getMemberSkills(member.id),
              completedTasks: Math.floor(Math.random() * 50) + 10,
              activeIssues: issues.length,
              contributionHistory: []
            };
          })
        );

        return membersWithStatus;
      },
      CACHE_TTL.MEMBERS_LIST
    );

    const meta = {
      total: members.length,
      working: members.filter(m => m.status === 'working').length,
      idle: members.filter(m => m.status === 'idle').length,
      offline: members.filter(m => m.status === 'offline').length
    };

    res.json({ data: members, meta });
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({
      error: 'Failed to fetch members',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 辅助函数：获取成员技能
function getMemberSkills(memberId: string): string[] {
  const skillsMap: Record<string, string[]> = {
    'architect': ['System Design', 'API Design', 'TypeScript'],
    'executor': ['Node.js', 'Python', 'Automation'],
    'designer': ['UI/UX', 'Figma', 'CSS'],
    'tester': ['Testing', 'QA', 'Automation'],
    'sysadmin': ['DevOps', 'Docker', 'Kubernetes']
  };
  return skillsMap[memberId] || ['General', 'Communication'];
}

// --------------------------------------------------------------------------
// 获取单个成员详情
// --------------------------------------------------------------------------

apiRouter.get('/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 实现类似上面的逻辑，返回单个成员详情
    res.json({
      data: {
        id,
        name: 'Member',
        role: 'Role',
        avatar: `/avatars/${id}.png`,
        status: 'working',
        statusMessage: 'Working on task',
        currentTask: null,
        skills: getMemberSkills(id),
        provider: 'unknown',
        statistics: {
          completedTasks: 23,
          activeIssues: 2,
          avgCompletionTime: '4.5h'
        },
        contributionHistory: [],
        recentActivity: []
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch member',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// --------------------------------------------------------------------------
// 刷新数据
// --------------------------------------------------------------------------

apiRouter.post('/refresh', async (req, res) => {
  const { type = 'all' } = req.body;

  try {
    if (type === 'issues' || type === 'all') {
      await invalidateCache(`issues:${githubOwner}:${githubRepo}*`);
    }
    if (type === 'members' || type === 'all') {
      await invalidateCache(`members:${githubOwner}:${githubRepo}`);
    }

    // 通知所有连接的客户端
    io.emit('system:refresh', { type, timestamp: new Date().toISOString() });

    res.json({
      status: 'refreshing',
      estimatedTime: 5000
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to refresh',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 使用 API 路由
app.use('/api/v1', apiRouter);

// ============================================================================
// GitHub Webhook 处理器
// ============================================================================

app.post('/webhook/github', express.json(), async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const event = req.headers['x-github-event'] as string;
  const payload = req.body;

  // TODO: 验证 GitHub webhook 签名

  console.log(`[Webhook] ${event}:`, payload.action);

  try {
    switch (event) {
      case 'issues':
        await handleIssuesWebhook(payload);
        break;
      case 'issue_comment':
        await handleCommentWebhook(payload);
        break;
      case 'member':
        // 成员变更 (如果有)
        break;
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('[Webhook] Error:', error);
    res.status(500).send('Webhook processing failed');
  }
});

async function handleIssuesWebhook(payload: any) {
  const { action, issue } = payload;

  // 失效缓存
  await invalidateCache(`issues:${githubOwner}:${githubRepo}*`);
  await invalidateCache(`issue:${githubOwner}:${githubRepo}:${issue.number}`);

  // 根据动作推送不同事件
  switch (action) {
    case 'opened':
      io.emit('issue:created', transformIssue(issue));
      break;
    case 'closed':
      io.emit('issue:closed', transformIssue(issue));
      break;
    case 'edited':
    case 'reopened':
      io.emit('issue:updated', transformIssue(issue));
      break;
    case 'assigned':
      io.emit('issue:assigned', {
        issue: transformIssue(issue),
        assignee: issue.assignee
      });
      break;
  }
}

async function handleCommentWebhook(payload: any) {
  const { action, issue, comment } = payload;

  if (action === 'created') {
    io.emit('issue:updated', transformIssue(issue));
  }
}

function transformIssue(issue: any) {
  return {
    id: issue.id,
    number: issue.number,
    title: issue.title,
    state: issue.state,
    labels: issue.labels?.map((l: any) => ({ id: l.id, name: l.name, color: l.color })) || [],
    assignee: issue.assignee ? {
      id: issue.assignee.login,
      name: issue.assignee.login,
      avatar: issue.assignee.avatar_url
    } : null,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    closed_at: issue.closed_at,
    html_url: issue.html_url
  };
}

// ============================================================================
// Socket.IO 连接处理
// ============================================================================

io.on('connection', (socket) => {
  console.log('[WS] Client connected:', socket.id);

  // --------------------------------------------------------------------------
  // 订阅频道
  // --------------------------------------------------------------------------

  socket.on('subscribe', ({ channels }) => {
    console.log(`[WS] ${socket.id} subscribing to:`, channels);
    channels.forEach((channel: string) => {
      socket.join(channel);
    });
  });

  socket.on('unsubscribe', ({ channels }) => {
    console.log(`[WS] ${socket.id} unsubscribing from:`, channels);
    channels.forEach((channel: string) => {
      socket.leave(channel);
    });
  });

  // --------------------------------------------------------------------------
  // 心跳
  // --------------------------------------------------------------------------

  socket.on('ping', (data) => {
    socket.emit('pong', { timestamp: Date.now() });
  });

  // --------------------------------------------------------------------------
  // 断开连接
  // --------------------------------------------------------------------------

  socket.on('disconnect', (reason) => {
    console.log(`[WS] ${socket.id} disconnected:`, reason);
  });

  // --------------------------------------------------------------------------
  // 错误处理
  // --------------------------------------------------------------------------

  socket.on('error', (error) => {
    console.error(`[WS] ${socket.id} error:`, error);
  });
});

// ============================================================================
// 启动服务器
// ============================================================================

httpServer.listen(config.port, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🤖 AI 团队实时展示系统 - 后端服务                          ║
╠═══════════════════════════════════════════════════════════╣
║  REST API:  http://localhost:${config.port}/api/v1         ║
║  WebSocket: ws://localhost:${config.port}                  ║
║  GitHub:    ${githubOwner}/${githubRepo}                    ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// ============================================================================
// 优雅关闭
// ============================================================================

process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down...');
  httpServer.close(() => {
    redis.disconnect();
    process.exit(0);
  });
});
