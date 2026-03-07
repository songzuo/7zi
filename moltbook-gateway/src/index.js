/**
 * Moltbook Gateway Service
 * 
 * 智能体世界网关，让智能体可以通过我们的平台与 Moltbook 互动
 */

require('dotenv').config();
const express = require('express');
const MoltbookClient = require('./moltbook-client');

const app = express();
app.use(express.json());

// 配置
const PORT = process.env.MOLTBOOK_GATEWAY_PORT || 3001;
const API_KEY = process.env.MOLTBOOK_API_KEY || 'moltbook_sk_d6oxuCaSrXjf0XgmoAsNFpS-yjptaSrd';
const AGENT_NAME = process.env.MOLTBOOK_AGENT_NAME || 'ClawdAssistant_1769859260';

// 初始化客户端
const moltbookClient = new MoltbookClient(API_KEY, AGENT_NAME);

// ==================== 认证中间件 ====================

/**
 * 简单的 API Key 验证中间件
 * 调用网关的智能体需要提供有效的 token
 */
function authenticateGateway(req, res, next) {
  const token = req.headers['x-gateway-token'] || req.query.token;
  
  // 如果配置了网关 token，则验证
  if (process.env.GATEWAY_AUTH_TOKEN) {
    if (token !== process.env.GATEWAY_AUTH_TOKEN) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid gateway token' 
      });
    }
  }
  
  next();
}

// ==================== API 路由 ====================

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'moltbook-gateway',
    agent: AGENT_NAME,
    timestamp: new Date().toISOString()
  });
});

// 获取主页仪表盘
app.get('/api/home', authenticateGateway, async (req, res) => {
  try {
    const data = await moltbookClient.getHome();
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// 获取当前 Agent 信息
app.get('/api/me', authenticateGateway, async (req, res) => {
  try {
    const data = await moltbookClient.getMe();
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// 获取认证状态
app.get('/api/status', authenticateGateway, async (req, res) => {
  try {
    const data = await moltbookClient.getStatus();
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// ==================== Posts ====================

// 创建帖子
app.post('/api/posts', authenticateGateway, async (req, res) => {
  try {
    const { submolt_name, title, content, url, type } = req.body;
    
    if (!submolt_name || !title) {
      return res.status(400).json({ 
        success: false, 
        error: 'submolt_name and title are required' 
      });
    }
    
    const data = await moltbookClient.createPost({ 
      submolt_name, 
      title, 
      content, 
      url, 
      type 
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// 获取 Feed
app.get('/api/posts', authenticateGateway, async (req, res) => {
  try {
    const { sort, limit, cursor } = req.query;
    const data = await moltbookClient.getFeed({ sort, limit: parseInt(limit), cursor });
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// 获取个性化 Feed
app.get('/api/feed', authenticateGateway, async (req, res) => {
  try {
    const { sort, filter, limit } = req.query;
    const data = await moltbookClient.getPersonalFeed({ sort, filter, limit: parseInt(limit) });
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// 获取单个帖子
app.get('/api/posts/:postId', authenticateGateway, async (req, res) => {
  try {
    const data = await moltbookClient.getPost(req.params.postId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// 删除帖子
app.delete('/api/posts/:postId', authenticateGateway, async (req, res) => {
  try {
    const data = await moltbookClient.deletePost(req.params.postId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// ==================== Comments ====================

// 添加评论
app.post('/api/posts/:postId/comments', authenticateGateway, async (req, res) => {
  try {
    const { content, parent_id } = req.body;
    
    if (!content) {
      return res.status(400).json({ 
        success: false, 
        error: 'content is required' 
      });
    }
    
    const data = await moltbookClient.addComment(
      req.params.postId, 
      content, 
      parent_id
    );
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// 获取评论
app.get('/api/posts/:postId/comments', authenticateGateway, async (req, res) => {
  try {
    const { sort, limit, cursor } = req.query;
    const data = await moltbookClient.getComments(
      req.params.postId, 
      { sort, limit: parseInt(limit), cursor }
    );
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// ==================== Voting ====================

// Upvote 帖子
app.post('/api/posts/:postId/upvote', authenticateGateway, async (req, res) => {
  try {
    const data = await moltbookClient.upvotePost(req.params.postId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// Downvote 帖子
app.post('/api/posts/:postId/downvote', authenticateGateway, async (req, res) => {
  try {
    const data = await moltbookClient.downvotePost(req.params.postId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// Upvote 评论
app.post('/api/comments/:commentId/upvote', authenticateGateway, async (req, res) => {
  try {
    const data = await moltbookClient.upvoteComment(req.params.commentId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// ==================== Submolts ====================

// 获取所有 Submolts
app.get('/api/submolts', authenticateGateway, async (req, res) => {
  try {
    const data = await moltbookClient.getSubmolts();
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// 获取 Submolt 信息
app.get('/api/submolts/:name', authenticateGateway, async (req, res) => {
  try {
    const data = await moltbookClient.getSubmolt(req.params.name);
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// 获取 Submolt Feed
app.get('/api/submolts/:name/feed', authenticateGateway, async (req, res) => {
  try {
    const { sort } = req.query;
    const data = await moltbookClient.getSubmoltFeed(req.params.name, { sort });
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// 订阅 Submolt
app.post('/api/submolts/:name/subscribe', authenticateGateway, async (req, res) => {
  try {
    const data = await moltbookClient.subscribeSubmolt(req.params.name);
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// 取消订阅
app.delete('/api/submolts/:name/subscribe', authenticateGateway, async (req, res) => {
  try {
    const data = await moltbookClient.unsubscribeSubmolt(req.params.name);
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// ==================== Following ====================

// 关注 Molty
app.post('/api/agents/:name/follow', authenticateGateway, async (req, res) => {
  try {
    const data = await moltbookClient.followMolty(req.params.name);
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// 取消关注
app.delete('/api/agents/:name/follow', authenticateGateway, async (req, res) => {
  try {
    const data = await moltbookClient.unfollowMolty(req.params.name);
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// 获取 Molty Profile
app.get('/api/agents/:name/profile', authenticateGateway, async (req, res) => {
  try {
    const data = await moltbookClient.getMoltyProfile(req.params.name);
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// ==================== Search ====================

// 语义搜索
app.get('/api/search', authenticateGateway, async (req, res) => {
  try {
    const { q, type, limit } = req.query;
    
    if (!q) {
      return res.status(400).json({ 
        success: false, 
        error: 'q (query) is required' 
      });
    }
    
    const data = await moltbookClient.search(q, { type, limit: parseInt(limit) });
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// ==================== Verification ====================

// 解决验证挑战
app.post('/api/verify', authenticateGateway, async (req, res) => {
  try {
    const { verification_code, answer } = req.body;
    
    if (!verification_code || !answer) {
      return res.status(400).json({ 
        success: false, 
        error: 'verification_code and answer are required' 
      });
    }
    
    const data = await moltbookClient.verify(verification_code, answer);
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// ==================== Notifications ====================

// 获取通知
app.get('/api/notifications', authenticateGateway, async (req, res) => {
  try {
    const data = await moltbookClient.getNotifications();
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// 标记帖子通知已读
app.post('/api/notifications/read-by-post/:postId', authenticateGateway, async (req, res) => {
  try {
    const data = await moltbookClient.markNotificationsReadByPost(req.params.postId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// 标记所有通知已读
app.post('/api/notifications/read-all', authenticateGateway, async (req, res) => {
  try {
    const data = await moltbookClient.markAllNotificationsRead();
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// ==================== 启动服务 ====================

app.listen(PORT, () => {
  console.log(`🦞 Moltbook Gateway running on port ${PORT}`);
  console.log(`📱 Agent: ${AGENT_NAME}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`📚 API Base: http://localhost:${PORT}/api`);
});

module.exports = app;