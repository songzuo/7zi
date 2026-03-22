import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  UserRole,
  Permission,
  validateCredentials,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isSessionExpired,
  isSessionExpiringSoon,
  isValidToken,
  generateToken,
  createSession,
  refreshSession,
  getPasswordStrength,
  canAccessResource,
  getDefaultPermissions,
  createMockUser,
  validateRegistration,
  generateSecurePassword,
  type User,
  type Session,
} from '../auth';

describe('认证模块', () => {
  describe('validateCredentials', () => {
    it('应该接受有效的凭证', () => {
      const result = validateCredentials({
        username: 'testuser',
        password: 'password123',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该接受邮箱作为用户名', () => {
      const result = validateCredentials({
        username: 'test@example.com',
        password: 'password123',
      });

      expect(result.valid).toBe(true);
    });

    it('应该拒绝无效的用户名', () => {
      const result = validateCredentials({
        username: 'invalid@',
        password: 'password123',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('用户名或邮箱格式无效');
    });

    it('应该拒绝空密码', () => {
      const result = validateCredentials({
        username: 'testuser',
        password: '',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('密码不能为空');
    });

    it('应该拒绝过短的密码', () => {
      const result = validateCredentials({
        username: 'testuser',
        password: '12345',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('密码长度至少为6位');
    });

    it('应该返回多个错误', () => {
      const result = validateCredentials({
        username: 'invalid',
        password: '12345',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('权限检查', () => {
    let user: User;
    let admin: User;
    let guest: User;

    beforeEach(() => {
      user = createMockUser({
        role: UserRole.USER,
        permissions: [Permission.READ, Permission.WRITE],
      });

      admin = createMockUser({
        role: UserRole.ADMIN,
        permissions: [Permission.READ, Permission.WRITE, Permission.DELETE, Permission.ADMIN],
      });

      guest = createMockUser({
        role: UserRole.GUEST,
        permissions: [Permission.READ],
      });
    });

    describe('hasPermission', () => {
      it('用户应该拥有自己被授予的权限', () => {
        expect(hasPermission(user, Permission.READ)).toBe(true);
        expect(hasPermission(user, Permission.WRITE)).toBe(true);
      });

      it('用户不应该拥有未被授予的权限', () => {
        expect(hasPermission(user, Permission.DELETE)).toBe(false);
        expect(hasPermission(user, Permission.ADMIN)).toBe(false);
      });

      it('管理员应该拥有所有权限', () => {
        expect(hasPermission(admin, Permission.READ)).toBe(true);
        expect(hasPermission(admin, Permission.WRITE)).toBe(true);
        expect(hasPermission(admin, Permission.DELETE)).toBe(true);
        expect(hasPermission(admin, Permission.ADMIN)).toBe(true);
      });

      it('访客应该只有读权限', () => {
        expect(hasPermission(guest, Permission.READ)).toBe(true);
        expect(hasPermission(guest, Permission.WRITE)).toBe(false);
      });
    });

    describe('hasAnyPermission', () => {
      it('应该返回用户拥有的任一权限', () => {
        expect(hasAnyPermission(user, [Permission.READ, Permission.DELETE])).toBe(true);
        expect(hasAnyPermission(user, [Permission.WRITE, Permission.ADMIN])).toBe(true);
      });

      it('应该返回 false 如果用户没有任何请求的权限', () => {
        expect(hasAnyPermission(user, [Permission.DELETE, Permission.ADMIN])).toBe(false);
      });

      it('管理员应该拥有所有权限', () => {
        expect(hasAnyPermission(admin, [Permission.READ])).toBe(true);
        expect(hasAnyPermission(admin, [Permission.DELETE, Permission.ADMIN])).toBe(true);
      });

      it('空数组应该返回 true', () => {
        expect(hasAnyPermission(user, [])).toBe(true);
      });
    });

    describe('hasAllPermissions', () => {
      it('应该返回 true 如果用户拥有所有请求的权限', () => {
        expect(hasAllPermissions(user, [Permission.READ])).toBe(true);
        expect(hasAllPermissions(user, [Permission.READ, Permission.WRITE])).toBe(true);
      });

      it('应该返回 false 如果用户缺少任一权限', () => {
        expect(hasAllPermissions(user, [Permission.READ, Permission.DELETE])).toBe(false);
        expect(hasAllPermissions(user, [Permission.WRITE, Permission.ADMIN])).toBe(false);
      });

      it('管理员应该拥有所有权限', () => {
        expect(hasAllPermissions(admin, [Permission.READ, Permission.WRITE, Permission.DELETE, Permission.ADMIN])).toBe(true);
      });

      it('空数组应该返回 true', () => {
        expect(hasAllPermissions(user, [])).toBe(true);
      });
    });
  });

  describe('会话管理', () => {
    describe('isSessionExpired', () => {
      it('应该识别已过期的会话', () => {
        const pastDate = new Date(Date.now() - 1000 * 60 * 60);
        const session: Session = {
          token: 'test-token',
          userId: 'user-123',
          expiresAt: pastDate,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        };

        expect(isSessionExpired(session)).toBe(true);
      });

      it('应该识别未过期的会话', () => {
        const futureDate = new Date(Date.now() + 1000 * 60 * 60);
        const session: Session = {
          token: 'test-token',
          userId: 'user-123',
          expiresAt: futureDate,
          createdAt: new Date(),
        };

        expect(isSessionExpired(session)).toBe(false);
      });

      it('应该识别刚过期的会话', () => {
        const justExpired = new Date(Date.now() - 1);
        const session: Session = {
          token: 'test-token',
          userId: 'user-123',
          expiresAt: justExpired,
          createdAt: new Date(Date.now() - 1000 * 60 * 60),
        };

        expect(isSessionExpired(session)).toBe(true);
      });
    });

    describe('isSessionExpiringSoon', () => {
      it('应该识别即将过期的会话（5分钟内）', () => {
        const soonToExpire = new Date(Date.now() + 1000 * 60 * 3);
        const session: Session = {
          token: 'test-token',
          userId: 'user-123',
          expiresAt: soonToExpire,
          createdAt: new Date(),
        };

        expect(isSessionExpiringSoon(session)).toBe(true);
      });

      it('应该识别不会很快过期的会话', () => {
        const farFromExpiry = new Date(Date.now() + 1000 * 60 * 30);
        const session: Session = {
          token: 'test-token',
          userId: 'user-123',
          expiresAt: farFromExpiry,
          createdAt: new Date(),
        };

        expect(isSessionExpiringSoon(session)).toBe(false);
      });

      it('应该支持自定义警告时间', () => {
        const almostExpired = new Date(Date.now() + 1000 * 60 * 2);
        const session: Session = {
          token: 'test-token',
          userId: 'user-123',
          expiresAt: almostExpired,
          createdAt: new Date(),
        };

        expect(isSessionExpiringSoon(session, 3)).toBe(true);
        expect(isSessionExpiringSoon(session, 1)).toBe(false);
      });

      it('应该对已过期的会话返回 false', () => {
        const expired = new Date(Date.now() - 1000 * 60);
        const session: Session = {
          token: 'test-token',
          userId: 'user-123',
          expiresAt: expired,
          createdAt: new Date(Date.now() - 1000 * 60 * 60),
        };

        expect(isSessionExpiringSoon(session)).toBe(false);
      });
    });

    describe('createSession', () => {
      it('应该创建有效的会话', () => {
        const session = createSession('user-123', 60);

        expect(session.userId).toBe('user-123');
        expect(session.token).toBeTruthy();
        expect(session.createdAt).toBeInstanceOf(Date);
        expect(session.expiresAt).toBeInstanceOf(Date);
        expect(isValidToken(session.token)).toBe(true);
      });

      it('会话应该在指定时间后过期', () => {
        const expiresInMinutes = 30;
        const session = createSession('user-456', expiresInMinutes);

        const expectedExpiry = new Date(session.createdAt.getTime() + expiresInMinutes * 60 * 1000);
        expect(session.expiresAt.getTime()).toBe(expectedExpiry.getTime());
      });

      it('默认过期时间应该是60分钟', () => {
        const session = createSession('user-789');

        const expectedExpiry = new Date(session.createdAt.getTime() + 60 * 60 * 1000);
        expect(session.expiresAt.getTime()).toBe(expectedExpiry.getTime());
      });
    });

    describe('refreshSession', () => {
      it('应该刷新会话并生成新令牌', () => {
        const oldSession = createSession('user-123', 60);
        const newSession = refreshSession(oldSession);

        expect(newSession.userId).toBe(oldSession.userId);
        expect(newSession.createdAt).toBe(oldSession.createdAt);
        expect(newSession.token).not.toBe(oldSession.token);
        expect(newSession.expiresAt.getTime()).toBeGreaterThan(oldSession.expiresAt.getTime());
      });

      it('应该使用指定的过期时间', () => {
        const oldSession = createSession('user-123', 60);
        const newSession = refreshSession(oldSession, 120);

        const expectedExpiry = new Date(newSession.createdAt.getTime() + 120 * 60 * 1000);
        expect(newSession.expiresAt.getTime()).toBe(expectedExpiry.getTime());
      });
    });
  });

  describe('令牌管理', () => {
    describe('isValidToken', () => {
      it('应该接受有效的令牌', () => {
        expect(isValidToken('abc123')).toBe(true);
        expect(isValidToken('token-with-dashes')).toBe(true);
        expect(isValidToken('token_with_underscores')).toBe(true);
        expect(isValidToken('token.with.dots')).toBe(true);
      });

      it('应该拒绝无效的令牌', () => {
        expect(isValidToken('')).toBe(false);
        expect(isValidToken('token with spaces')).toBe(false);
        expect(isValidToken('token@invalid')).toBe(false);
        expect(isValidToken('token#hash')).toBe(false);
      });
    });

    describe('generateToken', () => {
      it('应该生成指定长度的令牌', () => {
        const token = generateToken(16);
        expect(token.length).toBe(16);
      });

      it('应该生成有效的令牌', () => {
        const token = generateToken();
        expect(isValidToken(token)).toBe(true);
      });

      it('应该生成唯一的令牌', () => {
        const token1 = generateToken();
        const token2 = generateToken();
        expect(token1).not.toBe(token2);
      });

      it('默认长度应该是32', () => {
        const token = generateToken();
        expect(token.length).toBe(32);
      });
    });
  });

  describe('getPasswordStrength', () => {
    it('应该正确评估弱密码', () => {
      const result = getPasswordStrength('password');

      expect(result.strength).toBe('weak');
      expect(result.score).toBeLessThan(3);
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('应该正确评估中等强度密码', () => {
      const result = getPasswordStrength('Password123');

      expect(result.strength).toBe('medium');
      expect(result.score).toBeGreaterThanOrEqual(3);
      expect(result.score).toBeLessThan(5);
    });

    it('应该正确评估强密码', () => {
      const result = getPasswordStrength('Password123!@#');

      expect(result.strength).toBe('strong');
      expect(result.score).toBeGreaterThanOrEqual(5);
    });

    it('应该提供有用的反馈', () => {
      const result = getPasswordStrength('pass');

      expect(result.feedback).toContain('密码长度至少为8位');
      expect(result.feedback.length).toBeGreaterThan(1);
    });

    it('短密码应该被标记为弱', () => {
      const result = getPasswordStrength('Pw1!');

      expect(result.strength).toBe('weak');
      expect(result.feedback).toContain('密码长度至少为8位');
    });

    it('缺少数字的密码应该得到反馈', () => {
      const result = getPasswordStrength('Password!');

      expect(result.feedback).toContain('密码应包含数字');
    });

    it('缺少特殊字符的密码应该得到反馈', () => {
      const result = getPasswordStrength('Password123');

      expect(result.feedback).toContain('密码应包含特殊字符');
    });

    it('缺少大小写的密码应该得到反馈', () => {
      const result = getPasswordStrength('password123!');

      expect(result.feedback).toContain('密码应包含大小写字母');
    });
  });

  describe('资源访问控制', () => {
    let user: User;
    let admin: User;
    let otherUser: User;

    beforeEach(() => {
      user = createMockUser({
        id: 'user-1',
        permissions: [Permission.READ, Permission.WRITE],
      });

      admin = createMockUser({
        id: 'admin-1',
        role: UserRole.ADMIN,
        permissions: [Permission.READ, Permission.WRITE, Permission.DELETE, Permission.ADMIN],
      });

      otherUser = createMockUser({
        id: 'user-2',
        permissions: [Permission.READ, Permission.WRITE],
      });
    });

    it('用户应该可以访问自己的资源', () => {
      expect(canAccessResource(user, 'user-1', Permission.READ)).toBe(true);
      expect(canAccessResource(user, 'user-1', Permission.WRITE)).toBe(true);
    });

    it('用户不应该可以访问他人的资源', () => {
      expect(canAccessResource(user, 'user-2', Permission.READ)).toBe(false);
      expect(canAccessResource(user, 'user-2', Permission.WRITE)).toBe(false);
    });

    it('管理员应该可以访问所有资源', () => {
      expect(canAccessResource(admin, 'user-1', Permission.READ)).toBe(true);
      expect(canAccessResource(admin, 'user-2', Permission.WRITE)).toBe(true);
      expect(canAccessResource(admin, 'user-1', Permission.DELETE)).toBe(true);
    });

    it('用户没有权限时不应该可以访问资源', () => {
      expect(canAccessResource(user, 'user-1', Permission.DELETE)).toBe(false);
      expect(canAccessResource(user, 'user-1', Permission.ADMIN)).toBe(false);
    });
  });

  describe('getDefaultPermissions', () => {
    it('管理员应该拥有所有权限', () => {
      const permissions = getDefaultPermissions(UserRole.ADMIN);

      expect(permissions).toContain(Permission.READ);
      expect(permissions).toContain(Permission.WRITE);
      expect(permissions).toContain(Permission.DELETE);
      expect(permissions).toContain(Permission.ADMIN);
    });

    it('普通用户应该拥有读写权限', () => {
      const permissions = getDefaultPermissions(UserRole.USER);

      expect(permissions).toContain(Permission.READ);
      expect(permissions).toContain(Permission.WRITE);
      expect(permissions).not.toContain(Permission.DELETE);
      expect(permissions).not.toContain(Permission.ADMIN);
    });

    it('访客应该只有读权限', () => {
      const permissions = getDefaultPermissions(UserRole.GUEST);

      expect(permissions).toContain(Permission.READ);
      expect(permissions).not.toContain(Permission.WRITE);
      expect(permissions).not.toContain(Permission.DELETE);
      expect(permissions).not.toContain(Permission.ADMIN);
    });
  });

  describe('createMockUser', () => {
    it('应该创建具有默认值的用户', () => {
      const user = createMockUser();

      expect(user.id).toBe('user-123');
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe(UserRole.USER);
      expect(user.permissions).toContain(Permission.READ);
      expect(user.permissions).toContain(Permission.WRITE);
    });

    it('应该允许覆盖默认值', () => {
      const user = createMockUser({
        id: 'custom-id',
        username: 'customuser',
        email: 'custom@example.com',
        role: UserRole.ADMIN,
      });

      expect(user.id).toBe('custom-id');
      expect(user.username).toBe('customuser');
      expect(user.email).toBe('custom@example.com');
      expect(user.role).toBe(UserRole.ADMIN);
    });
  });

  describe('validateRegistration', () => {
    it('应该接受有效的注册信息', () => {
      const result = validateRegistration({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝无效的用户名', () => {
      const result = validateRegistration({
        username: 'ab',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('用户名格式无效：3-20个字符，只允许字母、数字、下划线');
    });

    it('应该拒绝无效的邮箱', () => {
      const result = validateRegistration({
        username: 'testuser',
        email: 'invalid-email',
        password: 'Password123',
        confirmPassword: 'Password123',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('邮箱格式无效');
    });

    it('应该拒绝弱密码', () => {
      const result = validateRegistration({
        username: 'testuser',
        email: 'test@example.com',
        password: 'weak',
        confirmPassword: 'weak',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('密码强度不足：至少8位，包含字母和数字');
    });

    it('应该拒绝不匹配的密码', () => {
      const result = validateRegistration({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password456',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('两次输入的密码不一致');
    });

    it('应该返回多个错误', () => {
      const result = validateRegistration({
        username: 'ab',
        email: 'invalid',
        password: 'weak',
        confirmPassword: 'different',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(2);
    });
  });

  describe('generateSecurePassword', () => {
    it('应该生成指定长度的密码', () => {
      const password = generateSecurePassword(12);
      expect(password.length).toBe(12);
    });

    it('应该生成包含小写字母的密码', () => {
      const password = generateSecurePassword();
      expect(/[a-z]/.test(password)).toBe(true);
    });

    it('应该生成包含大写字母的密码', () => {
      const password = generateSecurePassword();
      expect(/[A-Z]/.test(password)).toBe(true);
    });

    it('应该生成包含数字的密码', () => {
      const password = generateSecurePassword();
      expect(/[0-9]/.test(password)).toBe(true);
    });

    it('应该生成包含特殊字符的密码', () => {
      const password = generateSecurePassword();
      expect(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)).toBe(true);
    });

    it('应该生成唯一的密码', () => {
      const password1 = generateSecurePassword();
      const password2 = generateSecurePassword();
      expect(password1).not.toBe(password2);
    });

    it('生成的密码应该是强密码', () => {
      const password = generateSecurePassword();
      const strength = getPasswordStrength(password);

      expect(strength.strength).toBe('strong');
    });

    it('默认长度应该是16', () => {
      const password = generateSecurePassword();
      expect(password.length).toBe(16);
    });
  });

  describe('集成测试', () => {
    it('应该支持完整的用户认证流程', () => {
      // 1. 验证注册
      const registration = validateRegistration({
        username: 'newuser',
        email: 'new@example.com',
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
      });

      expect(registration.valid).toBe(true);

      // 2. 创建用户
      const user = createMockUser({
        username: 'newuser',
        email: 'new@example.com',
        permissions: getDefaultPermissions(UserRole.USER),
      });

      // 3. 验证登录凭证
      const credentials = validateCredentials({
        username: 'newuser',
        password: 'SecurePass123',
      });

      expect(credentials.valid).toBe(true);

      // 4. 创建会话
      const session = createSession(user.id);

      expect(isValidToken(session.token)).toBe(true);
      expect(isSessionExpired(session)).toBe(false);

      // 5. 验证权限
      expect(hasPermission(user, Permission.READ)).toBe(true);
      expect(hasPermission(user, Permission.WRITE)).toBe(true);
      expect(hasPermission(user, Permission.DELETE)).toBe(false);
    });

    it('应该正确处理会话过期和刷新', () => {
      const user = createMockUser();

      // 创建会话
      let session = createSession(user.id, 1);
      expect(isSessionExpired(session)).toBe(false);

      // 模拟时间流逝（会话过期）
      const expiredSession = {
        ...session,
        expiresAt: new Date(Date.now() - 1000),
      };

      expect(isSessionExpired(expiredSession)).toBe(true);

      // 刷新会话
      session = refreshSession(expiredSession, 60);
      expect(isSessionExpired(session)).toBe(false);
      expect(session.token).not.toBe(expiredSession.token);
    });
  });
});
