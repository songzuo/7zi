/**
 * @fileoverview Mock data generator for API tests
 * @description Provides in-memory mock data for testing
 */

export interface MockUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface MockTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MockProject {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export class MockDataGenerator {
  private users: Map<string, MockUser> = new Map();
  private tasks: Map<string, MockTask> = new Map();
  private projects: Map<string, MockProject> = new Map();
  private tokens: Map<string, string> = new Map();
  private refreshTokens: Map<string, string> = new Map();

  constructor() {
    // Initialize with some test data
    this.initializeTestData();
  }

  private initializeTestData() {
    // Create test users
    this.createUser({
      email: 'test@example.com',
      password: 'SecurePass123',
      name: 'Test User',
      role: 'member',
    });

    this.createUser({
      email: 'admin@example.com',
      password: 'AdminPass123',
      name: 'Admin User',
      role: 'admin',
    });

    this.createUser({
      email: 'owner@example.com',
      password: 'OwnerPass123',
      name: 'Owner User',
      role: 'owner',
    });
  }

  // User methods
  createUser(data: {
    email: string;
    password: string;
    name: string;
    role?: 'owner' | 'admin' | 'member';
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
    };

    this.users.set(user.id, user);
    return user;
  }

  findUserByEmail(email: string): MockUser | null {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  getUserById(id: string): MockUser | null {
    return this.users.get(id) || null;
  }

  updateUser(id: string, data: Partial<MockUser>): MockUser | null {
    const user = this.users.get(id);
    if (!user) return null;

    const updated = {
      ...user,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    this.users.set(id, updated);
    return updated;
  }

  deleteUser(id: string): boolean {
    return this.users.delete(id);
  }

  getAllUsers(): MockUser[] {
    return Array.from(this.users.values());
  }

  // Task methods
  createTask(data: {
    projectId: string;
    title: string;
    description?: string;
    assigneeId?: string;
    dueDate?: string;
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
    };

    this.tasks.set(task.id, task);
    return task;
  }

  getTaskById(id: string): MockTask | null {
    return this.tasks.get(id) || null;
  }

  updateTask(id: string, data: Partial<MockTask>): MockTask | null {
    const task = this.tasks.get(id);
    if (!task) return null;

    const updated = {
      ...task,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    this.tasks.set(id, updated);
    return updated;
  }

  deleteTask(id: string): boolean {
    return this.tasks.delete(id);
  }

  getTasksByProject(projectId: string): MockTask[] {
    return Array.from(this.tasks.values()).filter(
      task => task.projectId === projectId
    );
  }

  getAllTasks(): MockTask[] {
    return Array.from(this.tasks.values());
  }

  // Project methods
  createProject(data: {
    name: string;
    description?: string;
    ownerId: string;
  }): MockProject {
    const project: MockProject = {
      id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      description: data.description || '',
      ownerId: data.ownerId,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.projects.set(project.id, project);
    return project;
  }

  getProjectById(id: string): MockProject | null {
    return this.projects.get(id) || null;
  }

  updateProject(id: string, data: Partial<MockProject>): MockProject | null {
    const project = this.projects.get(id);
    if (!project) return null;

    const updated = {
      ...project,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    this.projects.set(id, updated);
    return updated;
  }

  deleteProject(id: string): boolean {
    return this.projects.delete(id);
  }

  getProjectsByOwner(ownerId: string): MockProject[] {
    return Array.from(this.projects.values()).filter(
      project => project.ownerId === ownerId
    );
  }

  getAllProjects(): MockProject[] {
    return Array.from(this.projects.values());
  }

  // Token methods
  generateToken(userId: string): string {
    const token = `mock-jwt-token-${userId}-${Date.now()}`;
    this.tokens.set(token, userId);
    return token;
  }

  getUserIdFromToken(token: string): string | null {
    return this.tokens.get(token) || null;
  }

  generateRefreshToken(userId: string): string {
    const refreshToken = `refresh-${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.refreshTokens.set(refreshToken, userId);
    return refreshToken;
  }

  getUserIdFromRefreshToken(refreshToken: string): string | null {
    return this.refreshTokens.get(refreshToken) || null;
  }

  invalidateToken(token: string): boolean {
    return this.tokens.delete(token);
  }

  invalidateRefreshToken(refreshToken: string): boolean {
    return this.refreshTokens.delete(refreshToken);
  }

  // Reset methods for test isolation
  resetUsers() {
    this.users.clear();
    this.tokens.clear();
    this.refreshTokens.clear();
    this.initializeTestData();
  }

  resetTasks() {
    this.tasks.clear();
  }

  resetProjects() {
    this.projects.clear();
  }

  resetAll() {
    this.users.clear();
    this.tasks.clear();
    this.projects.clear();
    this.tokens.clear();
    this.refreshTokens.clear();
    this.initializeTestData();
  }
}
