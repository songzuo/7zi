'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, MessageCircle, User } from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { href: '/', label: '首页', icon: Home },
  { href: '/discover', label: '发现', icon: Compass },
  { href: '/feedback', label: '反馈', icon: MessageCircle },
  { href: '/profile', label: '我的', icon: User },
]

interface BottomNavProps {
  className?: string
}

export function BottomNav({ className = '' }: BottomNavProps) {
  const pathname = usePathname()

  // 检查是否是当前页面
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* 占位元素 - 防止内容被底部导航遮挡 */}
      <div className="h-16 md:hidden" aria-hidden="true" />

      {/* 底部导航栏 */}
      <nav
        className={`
          fixed bottom-0 left-0 right-0 z-50
          border-t border-gray-200 bg-white
          px-2 py-2
          md:hidden
          dark:border-gray-700 dark:bg-gray-900
          ${className}
        `}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
        aria-label="底部导航"
      >
        <div className="flex items-center justify-around">
          {navItems.map(item => {
            const Icon = item.icon
            const active = isActive(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  group flex flex-col items-center justify-center
                  min-h-[48px] min-w-[48px]
                  rounded-xl transition-all duration-200
                  ${active
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }
                `}
                aria-current={active ? 'page' : undefined}
              >
                <div
                  className={`
                    relative flex items-center justify-center
                    rounded-full p-2
                    transition-all duration-200
                    ${active
                      ? 'bg-blue-100 dark:bg-blue-900/30'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                  `}
                  style={{ minWidth: '44px', minHeight: '44px' }}
                >
                  <Icon
                    className={`
                      h-6 w-6 transition-transform duration-200
                      ${active ? 'scale-110' : 'group-hover:scale-105'}
                    `}
                    aria-hidden="true"
                  />

                  {/* 活跃指示器 */}
                  {active && (
                    <span
                      className="absolute -bottom-1 h-1 w-4 rounded-full bg-blue-600 dark:bg-blue-400"
                      aria-hidden="true"
                    />
                  )}
                </div>

                <span
                  className={`
                    mt-1 text-xs font-medium
                    ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}
                  `}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
