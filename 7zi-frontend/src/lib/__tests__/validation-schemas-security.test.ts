/**
 * Validation Schemas Security Tests
 *
 * 测试安全相关的输入验证和清理功能
 * 防止注入攻击
 */

import { describe, it, expect } from 'vitest'
import {
  usernameSchema,
  passwordSchema,
  strongPasswordSchema,
  registerSchema,
  loginSchema,
  changePasswordSchema,
  sanitizeSqlString,
  sanitizeNoSqlString,
  sanitizeHtml,
  sanitizeCommandString,
  sanitizeObject,
  validateAndSanitizeBody,
  createValidationErrorResponse,
} from '@/lib/validation-schemas'

describe('Validation Schemas - Security Tests', () => {
  describe('sanitizeSqlString - SQL 注入防护', () => {
    it('应该移除单引号', () => {
      expect(sanitizeSqlString("test'value")).toBe('testvalue')
    })

    it('应该移除双引号', () => {
      expect(sanitizeSqlString('test"value')).toBe('testvalue')
    })

    it('应该移除分号', () => {
      expect(sanitizeSqlString('test;value')).toBe('testvalue')
    })

    it('应该移除反斜杠', () => {
      expect(sanitizeSqlString('test\\value')).toBe('testvalue')
    })

    it('应该移除 SQL 注释符号', () => {
      expect(sanitizeSqlString('test--comment')).toBe('testcomment')
      expect(sanitizeSqlString('test/*comment*/')).toBe('testcomment')
    })

    it('应该处理常见的 SQL 注入尝试', () => {
      expect(sanitizeSqlString("' OR '1'='1")).toBe('OR11')
      expect(sanitizeSqlString("'; DROP TABLE users; --")).toBe('DROPTABLEusers')
      expect(sanitizeSqlString('1; SELECT * FROM users')).toBe('1SELECTFROMusers')
    })

    it('应该保留正常内容', () => {
      expect(sanitizeSqlString('normalusername')).toBe('normalusername')
      expect(sanitizeSqlString('user_123')).toBe('user_123')
    })
  })

  describe('sanitizeNoSqlString - NoSQL 注入防护', () => {
    it('应该移除 MongoDB 操作符', () => {
      expect(sanitizeNoSqlString('$where')).toBe('')
      expect(sanitizeNoSqlString('$ne:value')).toBe('value')
      expect(sanitizeNoSqlString('$gt:10')).toBe('10')
    })

    it('应该移除带 $ 前缀的任何操作符', () => {
      expect(sanitizeNoSqlString('$gt')).toBe('')
      expect(sanitizeNoSqlString('$or')).toBe('')
      expect(sanitizeNoSqlString('$regex')).toBe('')
      expect(sanitizeNoSqlString('$all')).toBe('')
    })

    it('应该处理常见的 NoSQL 注入尝试', () => {
      expect(sanitizeNoSqlString('{"$gt": ""}')).toBe('{}')
      expect(sanitizeNoSqlString('{"$where": "function()"}')).toBe('{}')
      expect(sanitizeNoSqlString("$ne: 1")).toBe('1')
    })

    it('应该移除引号和反斜杠', () => {
      expect(sanitizeNoSqlString('test"value')).toBe('testvalue')
      expect(sanitizeNoSqlString("test'value")).toBe('testvalue')
      expect(sanitizeNoSqlString('test\\value')).toBe('testvalue')
    })
  })

  describe('sanitizeHtml - XSS 防护', () => {
    it('应该移除 script 标签', () => {
      expect(sanitizeHtml('<script>alert(1)</script>')).toBe('alert(1)')
      expect(sanitizeHtml('<script src="evil.js"></script>')).toBe('')
    })

    it('应该移除 iframe 标签', () => {
      expect(sanitizeHtml('<iframe src="evil.com"></iframe>')).toBe('')
      expect(sanitizeHtml('<iframe>content</iframe>')).toBe('')
    })

    it('应该移除 object 和 embed 标签', () => {
      expect(sanitizeHtml('<object data="evil.swf"></object>')).toBe('')
      expect(sanitizeHtml('<embed src="evil.swf">')).toBe('')
    })

    it('应该移除 javascript: 协议', () => {
      expect(sanitizeHtml('<a href="javascript:alert(1)">click</a>')).toBe('<a href="alert(1)">click</a>')
      expect(sanitizeHtml('javascript:void(0)')).toBe('void(0)')
    })

    it('应该移除事件处理器', () => {
      expect(sanitizeHtml('<img onerror="alert(1)">')).toBe('<img>')
      expect(sanitizeHtml('<div onclick="alert(1)">')).toBe('<div>')
      expect(sanitizeHtml('<body onload="alert(1)">')).toBe('<body>')
    })

    it('应该处理常见的 XSS 尝试', () => {
      expect(sanitizeHtml('<script>alert(String.fromCharCode(49))</script>')).toBe('alert(String.fromCharCode(49))')
      expect(sanitizeHtml('<img src=x onerror=alert(1)>')).toBe('<img src=x>')
      expect(sanitizeHtml('<svg onload=alert(1)>')).toBe('<svg>')
    })
  })

  describe('sanitizeCommandString - 命令注入防护', () => {
    it('应该移除 shell 特殊字符', () => {
      expect(sanitizeCommandString('test;ls')).toBe('testls')
      expect(sanitizeCommandString('test|cat')).toBe('testcat')
      expect(sanitizeCommandString('test`id`')).toBe('testid')
      expect(sanitizeCommandString('test$(whoami)')).toBe('test')
      expect(sanitizeCommandString('test$HOME')).toBe('testHOME')
    })

    it('应该移除命令替换语法', () => {
      expect(sanitizeCommandString('$(whoami)')).toBe('')
      expect(sanitizeCommandString('`id`')).toBe('')
      expect(sanitizeCommandString('${HOME}')).toBe('')
    })

    it('应该处理常见的命令注入尝试', () => {
      expect(sanitizeCommandString('; rm -rf /')).toBe('rmrf')
      expect(sanitizeCommandString('| cat /etc/passwd')).toBe('catetcpasswd')
      expect(sanitizeCommandString('&& curl evil.com')).toBe('curlevil.com')
    })
  })

  describe('sanitizeObject - 批量清理', () => {
    it('应该清理对象的所有字符串字段', () => {
      const obj = {
        name: "admin' --",
        email: 'test@example.com',
        age: 25,
      }

      const result = sanitizeObject(obj, 'sql')

      expect(result.name).toBe('admin')
      expect(result.email).toBe('test@example.com')
      expect(result.age).toBe(25)
    })

    it('应该保留非字符串字段', () => {
      const obj = {
        name: 'test',
        count: 10,
        active: true,
        items: [1, 2, 3],
      }

      const result = sanitizeObject(obj, 'general')

      expect(result.name).toBe('test')
      expect(result.count).toBe(10)
      expect(result.active).toBe(true)
      expect(result.items).toEqual([1, 2, 3])
    })

    it('应该处理嵌套对象', () => {
      const obj = {
        user: {
          name: "user; DROP--",
          bio: 'normal bio',
        },
      }

      // sanitizeObject 只处理顶层字符串字段，不递归处理嵌套对象
      const result = sanitizeObject(obj, 'sql')

      // 嵌套对象不会被清理（保留原样）
      expect(result.user.name).toBe("user; DROP--")
      expect(result.user.bio).toBe('normal bio')
    })

    it('应该处理简单扁平对象', () => {
      const obj = {
        name: "admin' --",
        bio: 'normal bio',
      }

      const result = sanitizeObject(obj, 'sql')

      expect(result.name).toBe('admin')
      expect(result.bio).toBe('normal bio')
    })
  })

  describe('usernameSchema - 用户名验证', () => {
    it('应该接受有效的用户名', () => {
      expect(usernameSchema.safeParse('john_doe').success).toBe(true)
      expect(usernameSchema.safeParse('User123').success).toBe(true)
      expect(usernameSchema.safeParse('test_user_2024').success).toBe(true)
    })

    it('应该拒绝太短的用户名', () => {
      const result = usernameSchema.safeParse('ab')
      expect(result.success).toBe(false)
    })

    it('应该拒绝太长的用户名', () => {
      const result = usernameSchema.safeParse('a'.repeat(21))
      expect(result.success).toBe(false)
    })

    it('应该拒绝包含特殊字符的用户名', () => {
      expect(usernameSchema.safeParse('user-name').success).toBe(false)
      expect(usernameSchema.safeParse('user@name').success).toBe(false)
      expect(usernameSchema.safeParse('user name').success).toBe(false)
      expect(usernameSchema.safeParse("user'name").success).toBe(false)
    })

    it('应该接受纯数字的用户名', () => {
      expect(usernameSchema.safeParse('123456').success).toBe(true)
    })
  })

  describe('passwordSchema - 密码验证', () => {
    it('应该接受有效密码', () => {
      expect(passwordSchema.safeParse('password123').success).toBe(true)
      expect(passwordSchema.safeParse('Test1234').success).toBe(true)
    })

    it('应该拒绝太短的密码', () => {
      const result = passwordSchema.safeParse('pass123')
      expect(result.success).toBe(false)
    })

    it('应该拒绝纯数字密码', () => {
      const result = passwordSchema.safeParse('12345678')
      expect(result.success).toBe(false)
    })

    it('应该拒绝纯字母密码', () => {
      const result = passwordSchema.safeParse('password')
      expect(result.success).toBe(false)
    })

    it('应该拒绝没有数字的密码', () => {
      const result = passwordSchema.safeParse('Password')
      expect(result.success).toBe(false)
    })
  })

  describe('strongPasswordSchema - 强密码验证', () => {
    it('应该接受包含特殊字符的密码', () => {
      expect(strongPasswordSchema.safeParse('Password123!').success).toBe(true)
      expect(strongPasswordSchema.safeParse('Test@2024#').success).toBe(true)
    })

    it('应该拒绝没有特殊字符的密码', () => {
      const result = strongPasswordSchema.safeParse('Password123')
      expect(result.success).toBe(false)
    })
  })

  describe('registerSchema - 注册验证', () => {
    it('应该接受有效的注册信息', () => {
      const result = registerSchema.safeParse({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      })

      expect(result.success).toBe(true)
    })

    it('应该拒绝密码不匹配', () => {
      const result = registerSchema.safeParse({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password456',
      })

      expect(result.success).toBe(false)
    })

    it('应该拒绝无效的用户名格式', () => {
      const result = registerSchema.safeParse({
        username: 'ab',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      })

      expect(result.success).toBe(false)
    })
  })

  describe('loginSchema - 登录验证', () => {
    it('应该接受有效的登录信息', () => {
      const result = loginSchema.safeParse({
        username: 'testuser',
        password: 'password123',
      })

      expect(result.success).toBe(true)
    })

    it('应该接受邮箱作为用户名', () => {
      const result = loginSchema.safeParse({
        username: 'test@example.com',
        password: 'password123',
      })

      expect(result.success).toBe(true)
    })

    it('应该拒绝空密码', () => {
      const result = loginSchema.safeParse({
        username: 'testuser',
        password: '',
      })

      expect(result.success).toBe(false)
    })
  })

  describe('changePasswordSchema - 修改密码验证', () => {
    it('应该接受有效的密码修改请求', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'OldPass123',
        newPassword: 'NewPass456',
        confirmPassword: 'NewPass456',
      })

      expect(result.success).toBe(true)
    })

    it('应该拒绝新密码不匹配', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'OldPass123',
        newPassword: 'NewPass456',
        confirmPassword: 'Different456',
      })

      expect(result.success).toBe(false)
    })

    it('应该拒绝弱新密码', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'OldPass123',
        newPassword: 'weak',
        confirmPassword: 'weak',
      })

      expect(result.success).toBe(false)
    })
  })

  describe('validateAndSanitizeBody - 综合验证和清理', () => {
    it('应该验证并清理 SQL 注入', async () => {
      const body = {
        username: "admin' --",
        email: 'test@example.com',
      }

      const result = await validateAndSanitizeBody(body, registerSchema, 'sql')

      expect(result.success).toBe(true)
      expect((result as { success: true; data: { username: string } }).data.username).toBe('admin')
    })

    it('应该拒绝无效的数据', async () => {
      const body = {
        username: 'ab',
        email: 'invalid-email',
        password: 'weak',
        confirmPassword: 'weak',
      }

      const result = await validateAndSanitizeBody(body, registerSchema, 'general')

      expect(result.success).toBe(false)
    })
  })

  describe('createValidationErrorResponse', () => {
    it('应该创建正确的错误响应格式', () => {
      const mockIssue = {
        path: ['username'],
        message: '用户名格式无效',
        code: 'invalid_string' as const,
      }

      const response = createValidationErrorResponse([mockIssue])

      expect(response.status).toBe(400)
      expect(response.headers.get('Content-Type')).toBe('application/json')
    })
  })
})
