'use client';

import { useEffect } from 'react';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { createLogger } from '@/lib/logger';
import { captureError } from '@/lib/monitoring/errors';
import { ErrorCategory, ErrorSeverity } from '@/lib/monitoring/errors';

const logger = createLogger('GlobalError');

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Next.js 13+ App Router 全局错误边界
 * 捕获根级未处理的错误，是最后一道防线
 * 
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */
export default function GlobalError({
  error,
  reset,
}: GlobalErrorProps) {
  useEffect(() => {
    // 记录严重错误
    logger.error('Critical error (global):', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });

    // 使用增强的错误追踪
    captureError(error, {
      category: 'application' as ErrorCategory,
      severity: 'fatal' as ErrorSeverity,
      extra: {
        digest: error.digest,
        url: typeof window !== 'undefined' ? window.location.href : '',
      },
    });
  }, [error]);

  return (
    <html>
      <body>
        <ErrorDisplay
          title="应用发生严重错误"
          message={error.message || '我们正在努力修复这个问题'}
          showReset={true}
          onReset={reset}
          errorDigest={error.digest}
          variant="fullscreen"
        />
      </body>
    </html>
  );
}
