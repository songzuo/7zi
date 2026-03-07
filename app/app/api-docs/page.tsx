/**
 * API 文档页面
 * Swagger UI 风格的交互式 API 文档
 */

'use client';

import { useEffect, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<object | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSpec() {
      try {
        const res = await fetch('/api/docs/json');
        if (!res.ok) {
          throw new Error('Failed to load API spec');
        }
        const data = await res.json();
        setSpec(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    loadSpec();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="text-gray-600">加载 API 文档...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-xl font-bold">加载失败</p>
          <p className="mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="swagger-wrapper">
      <style jsx global>{`
        .swagger-wrapper {
          min-height: 100vh;
        }
        .swagger-ui .topbar {
          display: none;
        }
        .swagger-ui .information-container {
          padding: 20px;
        }
        .swagger-ui .info .title {
          font-size: 28px;
        }
        /* 适配深色模式 */
        @media (prefers-color-scheme: dark) {
          .swagger-ui {
            background: #1a1a1a;
          }
          .swagger-ui .info .title,
          .swagger-ui .info p,
          .swagger-ui .info li,
          .swagger-ui .info table,
          .swagger-ui h4,
          .swagger-ui .opblock-tag,
          .swagger-ui .opblock .opblock-summary-description,
          .swagger-ui .tab li,
          .swagger-ui .response-col_links__link,
          .swagger-ui .response p,
          .swagger-ui .model-box,
          .swagger-ui .model-title,
          .swagger-ui .model {
            color: #e0e0e0;
          }
          .swagger-ui .opblock {
            border-color: #333;
            background: #2a2a2a;
          }
          .swagger-ui .opblock .opblock-summary {
            border-color: #333;
          }
          .swagger-ui input,
          .swagger-ui select,
          .swagger-ui textarea {
            background: #333;
            color: #e0e0e0;
            border-color: #444;
          }
        }
      `}</style>
      {spec && <SwaggerUI spec={spec} />}
    </div>
  );
}