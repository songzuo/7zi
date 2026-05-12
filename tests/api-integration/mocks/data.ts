/**
 * @fileoverview Mock data generator for API tests
 * @description Provides in-memory mock data for testing
 */

export interface MockUser {
  id: string
  email: string
  password: string
  name: string
  role: 'owner' | 'admin' | 'member'
  status: 'active' | 'inactive' | 'suspended'
  createdAt: string
  updatedAt: string
}

export interface MockTask {
  id: string
  projectId: string
  title: string
  description: string
  status: 'todo' | 'in-progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  assigneeId: string | null
  dueDate: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Full task interface matching actual API Task type
 * Used by task API handlers
 */
export interface MockTaskFull {
  id: string
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  dueDate?: string
  createdBy: string
  assignedTo?: string
  createdAt: string
  updatedAt: string
}

export interface MockProject {
  id: string
  name: string
  description: string
  ownerId: string
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
}

export interface MockFeedback {
  id: string
  user_id: string
  type: 'general' | 'bug' | 'feature' | 'suggestion' | 'complaint' | 'compliment' | 'other'
  rating: number
  title: string
  description: string
  email?: string
  status: 'pending' | 'in_review' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high'
  helpful_count: number
  not_helpful_count: number
  admin_notes?: string
  admin_id?: string
  created_at: string
  updated_at: string
  reviewed_at?: string
  resolved_at?: string
  metadata?: Record<string, unknown>
}

export interface MockRating {
  id: string
  user_id: string
  target_type: 'agent' | 'task' | 'feature' | 'project' | 'overall'
  target_id: string
  rating: number
  title?: string
  description?: string
  verified?: boolean
  helpful_count: number
  not_helpful_count: number
  created_at: string
  updated_at: string
  metadata?: Record<string, unknown>
}

export interface MockMember {
  id: string
  name: string
  email: string
  role: 'owner' | 'admin' | 'member'
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

export interface MockSearchHistory {
  query: string
  resultCount: number
  target: string
  timestamp: string
}

export interface MockAgent {
  id: string
  ownerId: string
  name: string
  type: 'assistant' | 'scheduler' | 'executor' | 'custom'
  status: 'online' | 'offline' | 'busy'
  capabilities: string[]
  endpoint?: string
  metadata?: Record<string, unknown>
  registeredAt: string
  lastHeartbeat?: string
}

export interface MockCapsule {
  id: string
  ownerId: string
  name: string
  description: string
  type: 'workflow' | 'agent' | 'template'
  genes: string[]
  status: 'draft' | 'published' | 'archived'
  createdAt: string
  updatedAt: string
}

export class MockDataGenerator {
  private users: Map<string, MockUser> = new Map()
  private tasks: Map<string, MockTask> = new Map()
  private tasksFull: Map<string, MockTaskFull> = new Map()
  private projects: Map<string, MockProject> = new Map()
  private feedbacks: Map<string, MockFeedback> = new Map()
  private tokens: Map<string, string> = new Map()
  private refreshTokens: Map<string, string> = new Map()
  private ratings: Map<string, MockRating> = new Map()
  private members: Map<string, MockMember> = new Map()
  private searchHistory: MockSearchHistory[] = []
  private agents: Map<string, MockAgent> = new Map()
  private capsules: Map<string, MockCapsule> = new Map()

  constructor() {
    // Initialize with some test data
    this.initializeTestData()
  }

  private initializeTestData() {
    // Create test users
    this.createUser({
      email: 'test@example.com',
      password: 'SecurePass123',
      name: 'Test User',
      role: 'member',
    })

    this.createUser({
      email: 'admin@example.com',
      password: 'AdminPass123',
      name: 'Admin User',
      role: 'admin',
    })

    this.createUser({
      email: 'owner@example.com',
      password: 'OwnerPass123',
      name: 'Owner User',
      role: 'owner',
    })

    // Create test feedbacks
    // Note: Create a feedback with ID 'feedback-1' for testing
    const feedback1 = {
      id: 'feedback-1',
      user_id: 'user-test-1',
      type: 'bug' as const,
      rating: 4,
      title: 'Login page bug',
      description: 'The login button is not responding on mobile devices',
      status: 'pending' as const,
      priority: 'medium' as const,
      helpful_count: 0,
      not_helpful_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    this.feedbacks.set('feedback-1', feedback1)

    this.createFeedback({
      user_id: 'user-test-2',
      type: 'feature',
      rating: 5,
      title: 'Add dark mode',
      description: 'Please add dark mode to improve user experience',
    })

    this.createFeedback({
      user_id: 'user-test-1',
      type: 'general',
      rating: 3,
      title: 'UI feedback',
      description: 'The interface could be more intuitive',
      status: 'in_review',
    })
  }

  // User methods
  createUser(data: {
    email: string
    password: string
    name: string
    role?: 'owner' | 'admin' | 'member'
  }): MockUser {
    const user: MockUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email: data.email,
      password: data.password,
      name: data.name,
      role: data.role || 'member',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.users.set(user.id, user)
    return user
  }

  findUserByEmail(email: string): MockUser | null {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user
      }
    }
    return null
  }

  getUserById(id: string): MockUser | null {
    return this.users.get(id) || null
  }

  updateUser(id: string, data: Partial<MockUser>): MockUser | null {
    const user = this.users.get(id)
    if (!user) return null

    const updated = {
      ...user,
      ...data,
      updatedAt: new Date().toISOString(),
    }

    this.users.set(id, updated)
    return updated
  }

  deleteUser(id: string): boolean {
    return this.users.delete(id)
  }

  getAllUsers(): MockUser[] {
    return Array.from(this.users.values())
  }

  // Task methods
  createTask(data: {
    projectId: string
    title: string
    description?: string
    assigneeId?: string
    dueDate?: string
  }): MockTask {
    const task: MockTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId: data.projectId,
      title: data.title,
      description: data.description || '',
      status: 'todo',
      priority: 'medium',
      assigneeId: data.assigneeId || null,
      dueDate: data.dueDate || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.tasks.set(task.id, task)
    return task
  }

  getTaskById(id: string): MockTask | null {
    return this.tasks.get(id) || null
  }

  updateTask(id: string, data: Partial<MockTask>): MockTask | null {
    const task = this.tasks.get(id)
    if (!task) return null

    const updated = {
      ...task,
      ...data,
      updatedAt: new Date().toISOString(),
    }

    this.tasks.set(id, updated)
    return updated
  }

  deleteTask(id: string): boolean {
    return this.tasks.delete(id)
  }

  getTasksByProject(projectId: string): MockTask[] {
    return Array.from(this.tasks.values()).filter(task => task.projectId === projectId)
  }

  getAllTasks(): MockTask[] {
    return Array.from(this.tasks.values())
  }

  // Full task methods (matching actual API Task interface)
  createTaskFull(data: {
    title: string
    description?: string
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
    dueDate?: string | null
    createdBy: string
    assignedTo?: string | null
  }): MockTaskFull {
    const task: MockTaskFull = {
      id: `task-full-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: data.title,
      description: data.description,
      priority: data.priority || 'medium',
      status: data.status || 'pending',
      dueDate: data.dueDate,
      createdBy: data.createdBy,
      assignedTo: data.assignedTo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.tasksFull.set(task.id, task)
    return task
  }

  getTaskFullById(id: string): MockTaskFull | null {
    return this.tasksFull.get(id) || null
  }

  updateTaskFull(id: string, data: Partial<MockTaskFull>): MockTaskFull | null {
    const task = this.tasksFull.get(id)
    if (!task) return null

    const updated: MockTaskFull = {
      ...task,
      ...data,
      updatedAt: new Date().toISOString(),
    }

    this.tasksFull.set(id, updated)
    return updated
  }

  getAllTasksFull(): MockTaskFull[] {
    return Array.from(this.tasksFull.values())
  }

  deleteTaskFull(id: string): boolean {
    return this.tasksFull.delete(id)
  }

  // Project methods
  createProject(data: {
    name: string
    description?: string
    ownerId: string
    status?: 'active' | 'archived'
  }): MockProject {
    const project: MockProject = {
      id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      description: data.description || '',
      ownerId: data.ownerId,
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.projects.set(project.id, project)
    return project
  }

  getProjectById(id: string): MockProject | null {
    return this.projects.get(id) || null
  }

  updateProject(id: string, data: Partial<MockProject>): MockProject | null {
    const project = this.projects.get(id)
    if (!project) return null

    const updated = {
      ...project,
      ...data,
      updatedAt: new Date().toISOString(),
    }

    this.projects.set(id, updated)
    return updated
  }

  deleteProject(id: string): boolean {
    return this.projects.delete(id)
  }

  getProjectsByOwner(ownerId: string): MockProject[] {
    return Array.from(this.projects.values()).filter(project => project.ownerId === ownerId)
  }

  getAllProjects(): MockProject[] {
    return Array.from(this.projects.values())
  }

  // Token methods
  generateToken(userId: string): string {
    const token = `mock-jwt-token-${userId}-${Date.now()}`
    this.tokens.set(token, userId)
    return token
  }

  getUserIdFromToken(token: string): string | null {
    return this.tokens.get(token) || null
  }

  generateRefreshToken(userId: string): string {
    const refreshToken = `refresh-${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    this.refreshTokens.set(refreshToken, userId)
    return refreshToken
  }

  getUserIdFromRefreshToken(refreshToken: string): string | null {
    return this.refreshTokens.get(refreshToken) || null
  }

  invalidateToken(token: string): boolean {
    return this.tokens.delete(token)
  }

  invalidateRefreshToken(refreshToken: string): boolean {
    return this.refreshTokens.delete(refreshToken)
  }

  // Reset methods for test isolation
  resetUsers() {
    this.users.clear()
    this.tokens.clear()
    this.refreshTokens.clear()
    this.initializeTestData()
  }

  resetTasks() {
    this.tasks.clear()
    this.tasksFull.clear()
  }

  resetProjects() {
    this.projects.clear()
  }

  resetFeedbacks() {
    this.feedbacks.clear()

    // Re-create test feedbacks with fixed IDs for testing
    const feedback1 = {
      id: 'feedback-1',
      user_id: 'user-test-1',
      type: 'bug' as const,
      rating: 4,
      title: 'Login page bug',
      description: 'The login button is not responding on mobile devices',
      status: 'pending' as const,
      priority: 'medium' as const,
      helpful_count: 0,
      not_helpful_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    this.feedbacks.set('feedback-1', feedback1)

    this.createFeedback({
      user_id: 'user-test-2',
      type: 'feature',
      rating: 5,
      title: 'Add dark mode',
      description: 'Please add dark mode to improve user experience',
    })

    this.createFeedback({
      user_id: 'user-test-1',
      type: 'general',
      rating: 3,
      title: 'UI feedback',
      description: 'The interface could be more intuitive',
      status: 'in_review',
    })
  }

  resetAll() {
    this.users.clear()
    this.tasks.clear()
    this.tasksFull.clear()
    this.projects.clear()
    this.feedbacks.clear()
    this.tokens.clear()
    this.refreshTokens.clear()
    this.initializeTestData()
  }

  // Feedback methods
  createFeedback(data: {
    user_id: string
    type: 'general' | 'bug' | 'feature' | 'suggestion' | 'complaint' | 'compliment' | 'other'
    rating: number
    title: string
    description: string
    email?: string
    status?: 'pending' | 'in_review' | 'resolved' | 'closed'
    priority?: 'low' | 'medium' | 'high'
    metadata?: Record<string, unknown>
  }): MockFeedback {
    const feedback: MockFeedback = {
      id: `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: data.user_id,
      type: data.type,
      rating: data.rating,
      title: data.title,
      description: data.description,
      email: data.email,
      status: data.status || 'pending',
      priority: data.priority || 'medium',
      helpful_count: 0,
      not_helpful_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: data.metadata,
    }

    this.feedbacks.set(feedback.id, feedback)
    return feedback
  }

  getFeedbackById(id: string): MockFeedback | null {
    return this.feedbacks.get(id) || null
  }

  getAllFeedbacks(): MockFeedback[] {
    return Array.from(this.feedbacks.values())
  }

  updateFeedback(id: string, data: Partial<MockFeedback>): MockFeedback | null {
    const feedback = this.feedbacks.get(id)
    if (!feedback) return null

    const updated = {
      ...feedback,
      ...data,
      updated_at: new Date().toISOString(),
    }

    this.feedbacks.set(id, updated)
    return updated
  }

  deleteFeedback(id: string): boolean {
    return this.feedbacks.delete(id)
  }

  filterFeedbacks(filters: {
    user_id?: string
    type?: string
    status?: string
    priority?: string
    rating_min?: number
    rating_max?: number
    search?: string
    sort_by?: 'created_at' | 'rating'
    sort_order?: 'asc' | 'desc'
    page?: number
    per_page?: number
  }): {
    feedbacks: MockFeedback[]
    meta: {
      total: number
      page: number
      per_page: number
      total_pages: number
    }
  } {
    let filtered = Array.from(this.feedbacks.values())

    // Apply filters
    if (filters.user_id) {
      filtered = filtered.filter(f => f.user_id === filters.user_id)
    }
    if (filters.type) {
      filtered = filtered.filter(f => f.type === filters.type)
    }
    if (filters.status) {
      filtered = filtered.filter(f => f.status === filters.status)
    }
    if (filters.priority) {
      filtered = filtered.filter(f => f.priority === filters.priority)
    }
    if (filters.rating_min !== undefined) {
      filtered = filtered.filter(f => f.rating >= filters.rating_min!)
    }
    if (filters.rating_max !== undefined) {
      filtered = filtered.filter(f => f.rating <= filters.rating_max!)
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(
        f =>
          f.title.toLowerCase().includes(searchLower) ||
          f.description.toLowerCase().includes(searchLower)
      )
    }

    // Sort
    const sortBy = filters.sort_by || 'created_at'
    const sortOrder = filters.sort_order || 'desc'

    filtered.sort((a, b) => {
      let comparison = 0
      if (sortBy === 'created_at') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      } else if (sortBy === 'rating') {
        comparison = a.rating - b.rating
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    // Paginate
    const page = filters.page || 1
    const perPage = Math.min(filters.per_page || 20, 100)
    const total = filtered.length
    const totalPages = Math.ceil(total / perPage)
    const startIndex = (page - 1) * perPage
    const paginated = filtered.slice(startIndex, startIndex + perPage)

    return {
      feedbacks: paginated,
      meta: {
        total,
        page,
        per_page: perPage,
        total_pages: totalPages,
      },
    }
  }

  getFeedbackStats() {
    const feedbacks = Array.from(this.feedbacks.values())
    const total = feedbacks.length

    const byStatus = {
      pending: 0,
      in_review: 0,
      resolved: 0,
      closed: 0,
    }

    const byType = {
      general: 0,
      bug: 0,
      feature: 0,
      suggestion: 0,
      complaint: 0,
      compliment: 0,
      other: 0,
      // Aliases for compatibility with test expectations
      bug_report: 0,
      feature_request: 0,
      general_feedback: 0,
    }

    const byPriority = {
      low: 0,
      medium: 0,
      high: 0,
    }

    let totalRating = 0

    feedbacks.forEach(f => {
      if (byStatus[f.status as keyof typeof byStatus] !== undefined) {
        byStatus[f.status as keyof typeof byStatus]++
      }

      // Count by actual type
      if (byType[f.type as keyof typeof byType] !== undefined) {
        byType[f.type as keyof typeof byType]++
      }

      // Map to aliases for test compatibility
      if (f.type === 'bug') {
        byType.bug_report++
      } else if (f.type === 'feature') {
        byType.feature_request++
      } else if (f.type === 'general') {
        byType.general_feedback++
      }

      if (byPriority[f.priority as keyof typeof byPriority] !== undefined) {
        byPriority[f.priority as keyof typeof byPriority]++
      }
      totalRating += f.rating
    })

    return {
      total,
      byStatus,
      byType,
      byPriority,
      averageRating: total > 0 ? totalRating / total : 0,
    }
  }

  // Rating methods
  createRating(data: {
    user_id: string
    target_type: 'agent' | 'task' | 'feature' | 'project' | 'overall'
    target_id: string
    rating: number
    title?: string
    description?: string
    verified?: boolean
    metadata?: Record<string, unknown>
  }): MockRating {
    const rating: MockRating = {
      id: `rating-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: data.user_id,
      target_type: data.target_type,
      target_id: data.target_id,
      rating: data.rating,
      title: data.title,
      description: data.description,
      verified: data.verified || false,
      helpful_count: 0,
      not_helpful_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: data.metadata,
    }

    this.ratings.set(rating.id, rating)
    return rating
  }

  getRatingById(id: string): MockRating | null {
    return this.ratings.get(id) || null
  }

  updateRating(id: string, data: Partial<MockRating>): MockRating | null {
    const rating = this.ratings.get(id)
    if (!rating) return null

    const updated = {
      ...rating,
      ...data,
      updated_at: new Date().toISOString(),
    }

    this.ratings.set(id, updated)
    return updated
  }

  deleteRating(id: string): boolean {
    return this.ratings.delete(id)
  }

  getAllRatings(): MockRating[] {
    return Array.from(this.ratings.values())
  }

  resetRatings() {
    this.ratings.clear()
  }

  // Member methods
  createMember(data: {
    name: string
    email: string
    role?: 'owner' | 'admin' | 'member'
    status?: 'active' | 'inactive'
  }): MockMember {
    const member: MockMember = {
      id: `member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      email: data.email,
      role: data.role || 'member',
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.members.set(member.id, member)
    return member
  }

  getMemberById(id: string): MockMember | null {
    return this.members.get(id) || null
  }

  getAllMembers(): MockMember[] {
    return Array.from(this.members.values())
  }

  resetMembers() {
    this.members.clear()
  }

  // Search history methods
  addSearchHistory(query: string, resultCount: number, target: string): void {
    this.searchHistory.push({
      query,
      resultCount,
      target,
      timestamp: new Date().toISOString(),
    })

    // Keep only last 100
    if (this.searchHistory.length > 100) {
      this.searchHistory = this.searchHistory.slice(-100)
    }
  }

  getRecentSearchHistory(limit: number = 5): MockSearchHistory[] {
    return this.searchHistory.slice(-limit).reverse()
  }

  resetSearchHistory() {
    this.searchHistory = []
  }

  // Agent methods
  createAgent(data: {
    ownerId: string
    name: string
    type: MockAgent['type']
    capabilities?: string[]
    endpoint?: string
    metadata?: Record<string, unknown>
  }): MockAgent {
    const agent: MockAgent = {
      id: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ownerId: data.ownerId,
      name: data.name,
      type: data.type,
      status: 'online',
      capabilities: data.capabilities || [],
      endpoint: data.endpoint,
      metadata: data.metadata,
      registeredAt: new Date().toISOString(),
    }
    this.agents.set(agent.id, agent)
    return agent
  }

  getAgentById(id: string): MockAgent | null {
    return this.agents.get(id) || null
  }

  findAgentByName(name: string): MockAgent | null {
    for (const agent of this.agents.values()) {
      if (agent.name === name) return agent
    }
    return null
  }

  getAgentsByOwner(ownerId: string): MockAgent[] {
    return Array.from(this.agents.values()).filter(a => a.ownerId === ownerId)
  }

  getAllAgents(): MockAgent[] {
    return Array.from(this.agents.values())
  }

  updateAgentHeartbeat(id: string): boolean {
    const agent = this.agents.get(id)
    if (!agent) return false
    agent.lastHeartbeat = new Date().toISOString()
    return true
  }

  unregisterAgent(id: string): boolean {
    return this.agents.delete(id)
  }

  // Capsule methods
  createCapsule(data: {
    ownerId: string
    name: string
    description: string
    type: MockCapsule['type']
    genes?: string[]
  }): MockCapsule {
    const capsule: MockCapsule = {
      id: `capsule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ownerId: data.ownerId,
      name: data.name,
      description: data.description,
      type: data.type,
      genes: data.genes || [],
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.capsules.set(capsule.id, capsule)
    return capsule
  }

  getCapsuleById(id: string): MockCapsule | null {
    return this.capsules.get(id) || null
  }

  getCapsulesByOwner(ownerId: string): MockCapsule[] {
    return Array.from(this.capsules.values()).filter(c => c.ownerId === ownerId)
  }

  getAllCapsules(): MockCapsule[] {
    return Array.from(this.capsules.values())
  }

  publishCapsule(id: string): MockCapsule | null {
    const capsule = this.capsules.get(id)
    if (!capsule) return null
    capsule.status = 'published'
    capsule.updatedAt = new Date().toISOString()
    return capsule
  }

  archiveCapsule(id: string): MockCapsule | null {
    const capsule = this.capsules.get(id)
    if (!capsule) return null
    capsule.status = 'archived'
    capsule.updatedAt = new Date().toISOString()
    return capsule
  }
}
