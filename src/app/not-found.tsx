import Link from 'next/link';

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
