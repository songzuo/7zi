'use client'

/**
 * 登录页面
 *
 * 提供用户登录功能，支持邮箱/用户名和密码登录
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/stores/auth-store'
import { shallow } from 'zustand/shallow'
import { trackLogin } from '@/lib/analytics/ga4'

export default function LoginPage() {
  const router = useRouter()
  // 使用细粒度选择器，避免不必要的重渲染
  const { login, logout: clearError } = useAuthStore(state => ({
    login: state.login,
    logout: state.logout,
  }))
  const isLoading = useAuthStore(state => state.isLoading)
  const error = useAuthStore(state => state.error)

  // 设置页面标题
  useEffect(() => {
    document.title = '登录 - 7zi Frontend'
  }, [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  // 表单验证状态
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // 验证邮箱格式
  const validateEmail = useCallback((value: string) => {
    if (!value) {
      setEmailError('请输入邮箱或用户名')
      return false
    }
    setEmailError('')
    return true
  }, [])

  // 验证密码
  const validatePassword = useCallback((value: string) => {
    if (!value) {
      setPasswordError('请输入密码')
      return false
    }
    if (value.length < 6) {
      setPasswordError('密码长度至少6位')
      return false
    }
    setPasswordError('')
    return true
  }, [])

  // 处理邮箱输入变化
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    if (emailError) validateEmail(value)
  }, [emailError, validateEmail])

  // 处理密码输入变化
  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPassword(value)
    if (passwordError) validatePassword(value)
  }, [passwordError, validatePassword])

  // 检查表单是否可以提交
  const canSubmit = email && password && !emailError && !passwordError

  // 处理登录提交
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    // 调用 store 的 clearError
    useAuthStore.getState().clearError()

    // 验证表单
    const isEmailValid = validateEmail(email)
    const isPasswordValid = validatePassword(password)

    if (!isEmailValid || !isPasswordValid) {
      return
    }

    try {
      await login(email, password)

      // Track login event
      trackLogin('email')
      // Identify user in GA4 after successful login
      const user = useAuthStore.getState().user
      if (user?.id) {
        identifyUser(user.id, { login_method: 'email' })
      }

      // 登录成功，跳转到仪表盘
      router.push('/dashboard')
    } catch (err) {
      // 错误已在 store 中处理
      console.error('Login failed:', err)
    }
  }, [email, password, login, router, validateEmail, validatePassword])

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md px-4">
        <div className="rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
          {/* 标题 */}
          <div className="mb-6 text-center">
            <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
              登录
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              欢迎回来，请登录您的账户
            </p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div
              className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* 登录表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 邮箱/用户名输入框 */}
            <Input
              id="email"
              name="email"
              type="text"
              label="用户名或邮箱"
              placeholder="请输入邮箱或用户名"
              value={email}
              onChange={handleEmailChange}
              error={emailError}
              autoComplete="email"
              fullWidth
            />

            {/* 密码输入框 */}
            <Input
              id="password"
              name="password"
              type="password"
              label="密码"
              placeholder="请输入密码"
              value={password}
              onChange={handlePasswordChange}
              error={passwordError}
              autoComplete="current-password"
              fullWidth
            />

            {/* 记住我 */}
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
              >
                记住我
              </label>
            </div>

            {/* 登录按钮 */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={!canSubmit}
              loading={isLoading}
              data-loading={isLoading ? 'true' : 'false'}
            >
              {isLoading ? '登录中...' : '登录'}
            </Button>
          </form>

          {/* 其他链接 */}
          <div className="mt-6 space-y-2 text-center text-sm">
            <a
              href="/forgot-password"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              忘记密码？
            </a>
            <p className="text-gray-600 dark:text-gray-400">
              还没有账户？{' '}
              <a
                href="/register"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                立即注册
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
