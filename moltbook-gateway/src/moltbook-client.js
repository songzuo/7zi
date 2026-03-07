/**
 * Moltbook API Client
 * 
 * 官方 API 文档: https://www.moltbook.com/skill.md
 * Base URL: https://www.moltbook.com/api/v1
 */

const axios = require('axios');

class MoltbookClient {
  /**
   * @param {string} apiKey - Moltbook API Key
   * @param {string} agentName - Agent Name
   */
  constructor(apiKey, agentName) {
    this.apiKey = apiKey;
    this.agentName = agentName;
    this.baseUrl = 'https://www.moltbook.com/api/v1';
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ==================== 认证相关 ====================

  /**
   * 注册新 Agent
   * @param {string} name - Agent 名称
   * @param {string} description - Agent 描述
   * @returns {Promise<Object>} 包含 api_key, claim_url, verification_code
   */
  static async register(name, description) {
    const response = await axios.post('https://www.moltbook.com/api/v1/agents/register', {
      name,
      description
    });
    return response.data;
  }

  /**
   * 获取当前 Agent 信息
   * @returns {Promise<Object>}
   */
  async getMe() {
    const response = await this.client.get('/agents/me');
    return response.data;
  }

  /**
   * 获取认证状态
   * @returns {Promise<Object>}
   */
  async getStatus() {
    const response = await this.client.get('/agents/status');
    return response.data;
  }

  /**
   * 更新 Agent Profile
   * @param {Object} data - { description, metadata }
   * @returns {Promise<Object>}
   */
  async updateProfile(data) {
    const response = await this.client.patch('/agents/me', data);
    return response.data;
  }

  /**
   * 设置 Owner Email
   * @param {string} email - Owner 邮箱
   * @returns {Promise<Object>}
   */
  async setupOwnerEmail(email) {
    const response = await this.client.post('/agents/me/setup-owner-email', { email });
    return response.data;
  }

  // ==================== Home / Dashboard ====================

  /**
   * 获取主页仪表盘信息
   * @returns {Promise<Object>}
   */
  async getHome() {
    const response = await this.client.get('/home');
    return response.data;
  }

  // ==================== Posts 帖子相关 ====================

  /**
   * 创建帖子
   * @param {Object} params
   * @param {string} params.submolt_name - Submolt 名称
   * @param {string} params.title - 标题
   * @param {string} [params.content] - 内容
   * @param {string} [params.url] - 链接 URL
   * @param {string} [params.type] - 类型: text, link, image
   * @returns {Promise<Object>}
   */
  async createPost(params) {
    const response = await this.client.post('/posts', params);
    return response.data;
  }

  /**
   * 获取 Feed
   * @param {Object} options
   * @param {string} [options.sort] - hot, new, top, rising
   * @param {number} [options.limit] - 数量
   * @param {string} [options.cursor] - 分页游标
   * @returns {Promise<Object>}
   */
  async getFeed(options = {}) {
    const params = new URLSearchParams();
    if (options.sort) params.append('sort', options.sort);
    if (options.limit) params.append('limit', options.limit);
    if (options.cursor) params.append('cursor', options.cursor);
    
    const response = await this.client.get(`/posts?${params.toString()}`);
    return response.data;
  }

  /**
   * 获取个性化 Feed (订阅 + 关注)
   * @param {Object} options
   * @param {string} [options.sort] - hot, new, top
   * @param {string} [options.filter] - all, following
   * @param {number} [options.limit] - 数量
   * @returns {Promise<Object>}
   */
  async getPersonalFeed(options = {}) {
    const params = new URLSearchParams();
    if (options.sort) params.append('sort', options.sort);
    if (options.filter) params.append('filter', options.filter);
    if (options.limit) params.append('limit', options.limit);
    
    const response = await this.client.get(`/feed?${params.toString()}`);
    return response.data;
  }

  /**
   * 获取单个帖子
   * @param {string} postId
   * @returns {Promise<Object>}
   */
  async getPost(postId) {
    const response = await this.client.get(`/posts/${postId}`);
    return response.data;
  }

  /**
   * 删除帖子
   * @param {string} postId
   * @returns {Promise<Object>}
   */
  async deletePost(postId) {
    const response = await this.client.delete(`/posts/${postId}`);
    return response.data;
  }

  // ==================== Comments 评论相关 ====================

  /**
   * 添加评论
   * @param {string} postId
   * @param {string} content - 评论内容
   * @param {string} [parentId] - 父评论 ID (用于回复)
   * @returns {Promise<Object>}
   */
  async addComment(postId, content, parentId = null) {
    const data = { content };
    if (parentId) data.parent_id = parentId;
    
    const response = await this.client.post(`/posts/${postId}/comments`, data);
    return response.data;
  }

  /**
   * 获取帖子评论
   * @param {string} postId
   * @param {Object} options
   * @param {string} [options.sort] - best, new, old
   * @param {number} [options.limit] - 数量
   * @param {string} [options.cursor] - 分页游标
   * @returns {Promise<Object>}
   */
  async getComments(postId, options = {}) {
    const params = new URLSearchParams();
    if (options.sort) params.append('sort', options.sort);
    if (options.limit) params.append('limit', options.limit);
    if (options.cursor) params.append('cursor', options.cursor);
    
    const response = await this.client.get(`/posts/${postId}/comments?${params.toString()}`);
    return response.data;
  }

  // ==================== Voting 投票相关 ====================

  /**
   * Upvote 帖子
   * @param {string} postId
   * @returns {Promise<Object>}
   */
  async upvotePost(postId) {
    const response = await this.client.post(`/posts/${postId}/upvote`);
    return response.data;
  }

  /**
   * Downvote 帖子
   * @param {string} postId
   * @returns {Promise<Object>}
   */
  async downvotePost(postId) {
    const response = await this.client.post(`/posts/${postId}/downvote`);
    return response.data;
  }

  /**
   * Upvote 评论
   * @param {string} commentId
   * @returns {Promise<Object>}
   */
  async upvoteComment(commentId) {
    const response = await this.client.post(`/comments/${commentId}/upvote`);
    return response.data;
  }

  // ==================== Submolts 社区相关 ====================

  /**
   * 创建 Submolt
   * @param {Object} params
   * @param {string} params.name - URL 安全名称
   * @param {string} params.display_name - 显示名称
   * @param {string} [params.description] - 描述
   * @param {boolean} [params.allow_crypto] - 是否允许加密货币内容
   * @returns {Promise<Object>}
   */
  async createSubmolt(params) {
    const response = await this.client.post('/submolts', params);
    return response.data;
  }

  /**
   * 获取所有 Submolts
   * @returns {Promise<Object>}
   */
  async getSubmolts() {
    const response = await this.client.get('/submolts');
    return response.data;
  }

  /**
   * 获取 Submolt 信息
   * @param {string} name
   * @returns {Promise<Object>}
   */
  async getSubmolt(name) {
    const response = await this.client.get(`/submolts/${name}`);
    return response.data;
  }

  /**
   * 获取 Submolt Feed
   * @param {string} name
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async getSubmoltFeed(name, options = {}) {
    const params = new URLSearchParams();
    if (options.sort) params.append('sort', options.sort);
    
    const response = await this.client.get(`/submolts/${name}/feed?${params.toString()}`);
    return response.data;
  }

  /**
   * 订阅 Submolt
   * @param {string} name
   * @returns {Promise<Object>}
   */
  async subscribeSubmolt(name) {
    const response = await this.client.post(`/submolts/${name}/subscribe`);
    return response.data;
  }

  /**
   * 取消订阅 Submolt
   * @param {string} name
   * @returns {Promise<Object>}
   */
  async unsubscribeSubmolt(name) {
    const response = await this.client.delete(`/submolts/${name}/subscribe`);
    return response.data;
  }

  // ==================== Following 关注相关 ====================

  /**
   * 关注 Molty
   * @param {string} moltyName
   * @returns {Promise<Object>}
   */
  async followMolty(moltyName) {
    const response = await this.client.post(`/agents/${moltyName}/follow`);
    return response.data;
  }

  /**
   * 取消关注 Molty
   * @param {string} moltyName
   * @returns {Promise<Object>}
   */
  async unfollowMolty(moltyName) {
    const response = await this.client.delete(`/agents/${moltyName}/follow`);
    return response.data;
  }

  /**
   * 获取 Molty Profile
   * @param {string} moltyName
   * @returns {Promise<Object>}
   */
  async getMoltyProfile(moltyName) {
    const response = await this.client.get(`/agents/profile?name=${moltyName}`);
    return response.data;
  }

  // ==================== Search 搜索 ====================

  /**
   * 语义搜索
   * @param {string} query - 搜索查询
   * @param {Object} options
   * @param {string} [options.type] - posts, comments, all
   * @param {number} [options.limit] - 数量
   * @returns {Promise<Object>}
   */
  async search(query, options = {}) {
    const params = new URLSearchParams();
    params.append('q', query);
    if (options.type) params.append('type', options.type);
    if (options.limit) params.append('limit', options.limit);
    
    const response = await this.client.get(`/search?${params.toString()}`);
    return response.data;
  }

  // ==================== Verification 验证 ====================

  /**
   * 解决验证挑战
   * @param {string} verificationCode
   * @param {string} answer - 答案 (带2位小数)
   * @returns {Promise<Object>}
   */
  async verify(verificationCode, answer) {
    const response = await this.client.post('/verify', {
      verification_code: verificationCode,
      answer: answer
    });
    return response.data;
  }

  // ==================== Notifications 通知 ====================

  /**
   * 获取通知
   * @returns {Promise<Object>}
   */
  async getNotifications() {
    const response = await this.client.get('/notifications');
    return response.data;
  }

  /**
   * 按帖子标记通知为已读
   * @param {string} postId
   * @returns {Promise<Object>}
   */
  async markNotificationsReadByPost(postId) {
    const response = await this.client.post(`/notifications/read-by-post/${postId}`);
    return response.data;
  }

  /**
   * 标记所有通知为已读
   * @returns {Promise<Object>}
   */
  async markAllNotificationsRead() {
    const response = await this.client.post('/notifications/read-all');
    return response.data;
  }

  // ==================== Moderation 管理 ====================

  /**
   * 置顶帖子
   * @param {string} postId
   * @returns {Promise<Object>}
   */
  async pinPost(postId) {
    const response = await this.client.post(`/posts/${postId}/pin`);
    return response.data;
  }

  /**
   * 取消置顶
   * @param {string} postId
   * @returns {Promise<Object>}
   */
  async unpinPost(postId) {
    const response = await this.client.delete(`/posts/${postId}/pin`);
    return response.data;
  }

  /**
   * 上传头像
   * @param {Buffer|ReadStream} file
   * @returns {Promise<Object>}
   */
  async uploadAvatar(file) {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', file);
    
    const response = await this.client.post('/agents/me/avatar', form, {
      headers: form.getHeaders()
    });
    return response.data;
  }

  /**
   * 删除头像
   * @returns {Promise<Object>}
   */
  async deleteAvatar() {
    const response = await this.client.delete('/agents/me/avatar');
    return response.data;
  }
}

module.exports = MoltbookClient;