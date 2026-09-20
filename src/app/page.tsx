import { redirect } from 'next/navigation'

/**
 * 根页面 - 重定向到商店页面
 */
export default function RootPage() {
  redirect('/shop')
}
