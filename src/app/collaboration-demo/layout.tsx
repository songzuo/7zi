import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '协作演示 - 7zi Studio',
  description: 'WebSocket 实时协作演示',
}

export default function CollaborationDemoLayout({ children }: { children: React.ReactNode }) {
  return children
}
