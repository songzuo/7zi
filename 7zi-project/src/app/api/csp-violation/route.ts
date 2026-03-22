import { NextRequest } from 'next/server';
import { success, error } from '@/lib/api/response';

/**
 * CSP 违规报告 API 端点
 * 收集并记录 CSP 违规事件
 */
export async function POST(request: NextRequest) {
  try {
    const report = await request.json();

    // 记录 CSP 违规（生产环境应发送到日志服务或 Sentry）
    console.error('[CSP Violation]', JSON.stringify(report, null, 2));

    // 如果配置了 Sentry，可以发送错误报告
    if (process.env.SENTRY_DSN) {
      try {
        const Sentry = (await import('@sentry/nextjs')).default;
        Sentry.withScope((scope) => {
          scope.setTag('csp-violation', true);
          scope.setLevel('warning');

          const { blockedURI, violatedDirective, originalPolicy } =
            report['csp-report'] || {};

          Sentry.captureMessage(
            `CSP Violation: ${violatedDirective} - ${blockedURI}`,
            {
              level: 'warning',
              extra: {
                blockedURI,
                violatedDirective,
                originalPolicy,
                fullReport: report,
              },
            }
          );
        });
      } catch (sentryError) {
        console.error('[CSP] Failed to send to Sentry:', sentryError);
      }
    }

    // 返回成功响应
    return success({ received: true });
  } catch (err) {
    console.error('[CSP] Error processing report:', err);
    return error('INVALID_REPORT', 'Invalid CSP report format', {
      status: 400,
      details: err instanceof Error ? { message: err.message } : undefined,
    });
  }
}

// 支持 GET 请求（用于测试）
export async function GET() {
  return success({
    endpoint: 'CSP Violation Reporting Endpoint',
    status: 'active',
    documentation: '/docs/CSP_CONFIGURATION_GUIDE.md',
  });
}
