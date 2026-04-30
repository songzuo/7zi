'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, ArrowRight, Check, X, Mail, Lock, User } from 'lucide-react'
import { getPasswordStrength } from '@/lib/auth'

type Language = 'zh' | 'en'

interface Translations {
  title: string
  subtitle: string
  email: string
  username: string
  password: string
  confirmPassword: string
  submit: string
  loginLink: string
  passwordStrength: {
    weak: string
    medium: string
    strong: string
  }
  errors: {
    emailRequired: string
    emailInvalid: string
    usernameRequired: string
    usernameInvalid: string
    passwordRequired: string
    passwordTooShort: string
    confirmRequired: string
    passwordMismatch: string
  }
  plan: {
    pro: string
    free: string
  }
}

const zhTranslations: Translations = {
  title: '创建账号',
  subtitle: '开始使用 7zi 服务',
  email: '邮箱地址',
  username: '用户名',
  password: '密码',
  confirmPassword: '确认密码',
  submit: '注册',
  loginLink: '已有账号？登录',
  passwordStrength: {
    weak: '弱',
    medium: '中',
    strong: '强',
  },
  errors: {
    emailRequired: '请输入邮箱地址',
    emailInvalid: '请输入有效的邮箱地址',
    usernameRequired: '请输入用户名',
    usernameInvalid: '用户名格式无效：3-20个字符，只允许字母、数字、下划线',
    passwordRequired: '请输入密码',
    passwordTooShort: '密码长度至少为8位',
    confirmRequired: '请确认密码',
    passwordMismatch: '两次输入的密码不一致',
  },
  plan: {
    pro: 'Pro 套餐',
    free: 'Free 套餐',
  },
}

const enTranslations: Translations = {
  title: 'Create Account',
  subtitle: 'Get started with 7zi',
  email: 'Email Address',
  username: 'Username',
  password: 'Password',
  confirmPassword: 'Confirm Password',
  submit: 'Sign Up',
  loginLink: 'Already have an account? Log in',
  passwordStrength: {
    weak: 'Weak',
    medium: 'Medium',
    strong: 'Strong',
  },
  errors: {
    emailRequired: 'Email is required',
    emailInvalid: 'Please enter a valid email address',
    usernameRequired: 'Username is required',
    usernameInvalid: 'Username must be 3-20 characters, letters, numbers, and underscores only',
    passwordRequired: 'Password is required',
    passwordTooShort: 'Password must be at least 8 characters',
    confirmRequired: 'Please confirm your password',
    passwordMismatch: 'Passwords do not match',
  },
  plan: {
    pro: 'Pro Plan',
    free: 'Free Plan',
  },
}

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const plan = searchParams.get('plan')

  const [language, setLanguage] = useState<Language>('zh')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const t = language === 'zh' ? zhTranslations : enTranslations

  const passwordStrength = getPasswordStrength(password)

  const strengthColor = {
    weak: 'bg-red-500',
    medium: 'bg-yellow-500',
    strong: 'bg-green-500',
  }

  const strengthTextColor = {
    weak: 'text-red-500',
    medium: 'text-yellow-500',
    strong: 'text-green-500',
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Email validation
    if (!email) {
      newErrors.email = t.errors.emailRequired
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t.errors.emailInvalid
    }

    // Username validation
    if (!username) {
      newErrors.username = t.errors.usernameRequired
    } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      newErrors.username = t.errors.usernameInvalid
    }

    // Password validation
    if (!password) {
      newErrors.password = t.errors.passwordRequired
    } else if (password.length < 8) {
      newErrors.password = t.errors.passwordTooShort
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = t.errors.confirmRequired
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = t.errors.passwordMismatch
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)

    try {
      // TODO: Integrate with backend API
      console.log('Register submitted:', { email, username, password, plan })
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      router.push('/dashboard')
    } catch (error) {
      console.error('Registration error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Left Side - Form */}
      <div className="flex flex-1 flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          {/* Language Toggle */}
          <div className="mb-8 flex items-center justify-end">
            <button
              onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
              className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              {language === 'zh' ? 'EN' : '中文'}
            </button>
          </div>

          {/* Plan Banner */}
          {plan === 'pro' && (
            <div className="mb-6 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              {t.plan.pro}
            </div>
          )}

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t.title}</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t.subtitle}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.email}
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={`block w-full rounded-lg border px-3 py-3 pl-10 text-sm ${
                    errors.email
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
                  }`}
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.username}
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className={`block w-full rounded-lg border px-3 py-3 pl-10 text-sm ${
                    errors.username
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
                  }`}
                  placeholder="johndoe"
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-red-500">{errors.username}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.password}
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`block w-full rounded-lg border px-3 py-3 pl-10 pr-10 text-sm ${
                    errors.password
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className={`h-full transition-all ${strengthColor[passwordStrength.strength]}`}
                        style={{
                          width:
                            passwordStrength.strength === 'weak'
                              ? '33%'
                              : passwordStrength.strength === 'medium'
                                ? '66%'
                                : '100%',
                        }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${strengthTextColor[passwordStrength.strength]}`}>
                      {t.passwordStrength[passwordStrength.strength]}
                    </span>
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {passwordStrength.feedback.map((fb, i) => (
                        <li key={i} className="flex items-center gap-1 text-xs text-gray-500">
                          <X className="h-3 w-3 text-red-500" />
                          {fb}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.confirmPassword}
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className={`block w-full rounded-lg border px-3 py-3 pl-10 pr-10 text-sm ${
                    errors.confirmPassword
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  {t.submit}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            {t.loginLink}{' '}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              {language === 'zh' ? '登录' : 'Log in'}
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Branding */}
      <div className="hidden flex-1 bg-gradient-to-br from-blue-600 to-purple-600 lg:flex lg:flex-col lg:justify-center lg:items-center">
        <div className="max-w-md text-center text-white">
          <h2 className="text-4xl font-bold">7zi</h2>
          <p className="mt-4 text-lg opacity-90">
            {language === 'zh'
              ? '让工作更高效，让协作更简单'
              : 'Make work more efficient, collaboration simpler'}
          </p>
        </div>
      </div>
    </div>
  )
}
