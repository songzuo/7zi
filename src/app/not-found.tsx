import Link from 'next/link';

// 强制动态渲染
export const dynamic = 'force-dynamic';

/**
 * 404 Not Found 页面
 */
export default function NotFound() {
  return (
    <div>
      <h1>404 - Page Not Found</h1>
      <Link href="/">Go Home</Link>
    </div>
  );
}
