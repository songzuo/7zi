'use client'

import { useState, createContext, useContext, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, MessageCircle, User, Menu, X, Globe, Settings } from 'lucide-react'
import { HamburgerMenu } from './HamburgerMenu'
import { BottomNav } from './BottomNav'

// 移动端导航项
const navItems = [
  { href: '/', label: '首页', icon: Home },
  { href: '/discover', label: '发现', icon: Compass },
  { href: '/feedback', label: '反馈', icon: MessageCircle },
  { href: '/profile', label: '我的', icon: User },
]

// 侧边菜单项
const sidebarItems = [
  { href: '/pricing', label: '定价方案', labelEn: 'Pricing' },
  { href: '/notification-demo', label: '通知示例', labelEn: 'Notifications' },
  { href: '/dashboard', label: '仪表盘', labelEn: 'Dashboard' },
  { href: '/design-system', label: '设计系统', labelEn: 'Design System' },
  { href: '/admin', label: '管理后台', labelEn: 'Admin' },
  { href: '/settings', label: '设置', labelEn: 'Settings', icon: Settings },
]

// 上下文
interface MobileNavContextType {
  isSidebarOpen: boolean
  toggleSidebar: () => void
  closeSidebar: () => void
}

const MobileNavContext = createContext<MobileNavContextType | null>(null)

export function useMobileNav() {
  const context = useContext(MobileNavContext)
  if (!context) {
    throw new Error('useMobileNav must be used within MobileNavProvider')
  }
  return context
}

// 移动端导航提供者
function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const pathname = usePathname()

  // 路由变化时关闭侧边栏
  useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])

  // 锁定 body 滚动
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isSidebarOpen])

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)
  const closeSidebar = () => setIsSidebarOpen(false)

  return (
    <MobileNavContext.Provider value={{ isSidebarOpen, toggleSidebar, closeSidebar }}>
      {children}
    </MobileNavContext.Provider>
  )
}

// 移动端布局组件
interface MobileLayoutProps {
  children: React.ReactNode
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const pathname = usePathname()

  // 路由变化时关闭侧边栏
  useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])

  // 锁定 body 滚动
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isSidebarOpen])

  return (
    <div className="mobile-layout">
      {/* 顶部导航栏 - 移动端 */}
      <header
        className="fixed left-0 right-0 top-0 z-40 bg-white dark:bg-gray-900"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
          {/* 汉堡菜单按钮 */}
          <HamburgerMenu
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          />

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-blue-600">7zi</span>
          </Link>

          {/* 语言切换（占位） */}
          <div className="h-10 w-10" aria-hidden="true" />
        </div>
      </header>

      {/* 侧边菜单遮罩 */}
      <div
        className={`
          fixed inset-0 z-40 bg-black/50 transition-opacity duration-300
          ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* 侧边菜单 */}
      <aside
        id="mobile-menu"
        className={`
          fixed left-0 top-0 z-50 h-full w-72
          transform bg-white pt-20 transition-transform duration-300
          dark:bg-gray-900
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          paddingTop: 'env(safe-area-inset-top)',
        }}
        aria-label="移动端导航菜单"
        aria-hidden={!isSidebarOpen}
      >
        {/* 用户信息区域 */}
        <div className="border-b border-gray-200 px-4 pb-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
              <User className="h-6 w-6" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">访客用户</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">点击登录</p>
            </div>
          </div>
        </div>

        {/* 菜单项 */}
        <nav className="p-4">
          <ul className="space-y-1">
            {sidebarItems.map(item => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`
                      flex items-center gap-3 rounded-lg px-4 py-3
                      transition-colors duration-200
                      ${isActive
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                      }
                    `}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {Icon && <Icon className="h-5 w-5" aria-hidden="true" />}
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* 底部信息 */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <button className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Globe className="h-4 w-4" />
              <span>中文</span>
            </button>
            <span className="text-xs text-gray-400">v1.13</span>
          </div>
        </div>
      </aside>

      {/* 主内容区域 */}
      <main className="min-h-screen pt-16">
        <div className="pb-20">
          {children}
        </div>
      </main>

      {/* 底部导航栏 */}
      <BottomNav />
    </div>
  )
}

export default MobileLayout
