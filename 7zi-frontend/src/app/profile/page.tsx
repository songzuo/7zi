'use client'

import { MobileLayout } from '@/components/navigation'
import { User, Settings, Bell, Shield, Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { useEffect, useState } from 'react'

type ThemeMode = 'light' | 'dark' | 'system'

export default function ProfilePage() {
  const { mode, setMode, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const menuItems = [
    { icon: User, label: '个人信息', href: '/profile/info' },
    { icon: Bell, label: '消息通知', href: '/profile/notifications' },
    { icon: Shield, label: '隐私安全', href: '/profile/privacy' },
    { icon: Settings, label: '设置', href: '/settings' },
  ]

  const themeOptions: { value: ThemeMode; label: string; icon: React.ElementType }[] = [
    { value: 'light', label: '浅色模式', icon: Sun },
    { value: 'dark', label: '深色模式', icon: Moon },
    { value: 'system', label: '跟随系统', icon: Monitor },
  ]

  if (!mounted) {
    return null
  }

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 px-4 py-8 dark:from-gray-900 dark:to-gray-800">
        <div className="mx-auto max-w-md">
          {/* 用户信息卡片 */}
          <div className="mb-6 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                <User className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  访客用户
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  点击登录
                </p>
              </div>
            </div>
          </div>

          {/* 主题设置 */}
          <div className="mb-6 rounded-lg bg-white shadow dark:bg-gray-800">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                外观设置
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                选择您喜欢的主题模式
              </p>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-2">
                {themeOptions.map((option) => {
                  const Icon = option.icon
                  const isActive = mode === option.value
                  return (
                    <button
                      key={option.value}
                      onClick={() => setMode(option.value)}
                      className={`
                        flex flex-col items-center gap-2 rounded-lg p-3 transition-all
                        ${isActive 
                          ? 'bg-blue-50 text-blue-600 ring-2 ring-blue-500 dark:bg-blue-900/30 dark:text-blue-400' 
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                        }
                      `}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-xs font-medium">{option.label}</span>
                    </button>
                  )
                })}
              </div>
              <div className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
                当前主题：{resolvedTheme === 'dark' ? '🌙 深色' : '☀️ 浅色'}
              </div>
            </div>
          </div>

          {/* 菜单列表 */}
          <div className="rounded-lg bg-white shadow dark:bg-gray-800">
            {menuItems.map((item, index) => (
              <a
                key={item.label}
                href={item.href}
                className={`
                  flex items-center gap-4 px-4 py-4
                  ${index !== menuItems.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}
                  hover:bg-gray-50 dark:hover:bg-gray-700/50
                `}
              >
                <item.icon className="h-5 w-5 text-gray-500" />
                <span className="flex-1 font-medium text-gray-700 dark:text-gray-300">
                  {item.label}
                </span>
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </MobileLayout>
  )
}