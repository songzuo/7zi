/**
 * Back navigation link component
 */

import Link from 'next/link';

export function BackLink() {
  return (
    <div className="mb-6">
      <Link
        href="/tasks"
        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
      >
        ← 返回任务列表
      </Link>
    </div>
  );
}
