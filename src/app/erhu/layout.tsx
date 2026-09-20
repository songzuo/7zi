import Link from 'next/link'
import type { Metadata } from 'next'

// 不在此处设置全局 metadata，让各页面独立控制 title/description/canonical
export const metadata: Metadata = {
  title: {
    template: '%s | 尔虎',
    default: '尔虎 | 7zi',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

const pages = [
  { href: '/erhu/brand', label: '为尔虎品牌' },
  { href: '/erhu/company', label: '尔虎公司' },
  { href: '/erhu/shanghai', label: '上海尔虎' },
  { href: '/erhu/hunan', label: '湖南尔虎' },
  { href: '/erhu/changsha', label: '长沙尔虎' },
  { href: '/erhu/uk', label: '英国尔虎' },
]

export default function ErhuLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="erhu-layout" style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#666', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← 返回 7zi.com
        </Link>
      </div>
      <nav style={{
        display: 'flex',
        flexWrap: 'wrap' as const,
        gap: '0.5rem',
        marginBottom: '2rem',
        padding: '1rem',
        background: '#f5f5f5',
        borderRadius: 8,
      }}>
        {pages.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            style={{
              padding: '0.5rem 1rem',
              background: '#fff',
              borderRadius: 6,
              textDecoration: 'none',
              color: '#333',
              fontSize: '0.9rem',
              border: '1px solid #ddd',
              whiteSpace: 'nowrap' as const,
            }}
          >
            {p.label}
          </Link>
        ))}
      </nav>
      <main>{children}</main>
      <footer style={{ marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid #eee', textAlign: 'center' as const, color: '#999', fontSize: '0.85rem' }}>
        © {new Date().getFullYear()} 7zi Studio · 为尔虎品牌矩阵
      </footer>
    </div>
  )
}
