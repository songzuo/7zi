/**
 * Export API Route
 * Data export endpoint (PROTECTED)
 * Requires authentication and export permission
 *
 * @module export-api
 * @version 1.0.8
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { withAuth, withRateLimit, RATE_LIMIT_CONFIG } from '@/middleware/auth';

// ============================================================================
// Types
// ============================================================================

/**
 * Export options response
 */
interface ExportOptions {
  /** Supported export formats */
  formats: ('json' | 'csv' | 'xlsx')[];
  /** Default format */
  default: string;
  /** Maximum records per export */
  maxRecords: number;
  /** Available export fields */
  fields?: string[];
}

// ============================================================================
// GET /api/export - Get export options
// ============================================================================

/**
 * GET /api/export
 *
 * Get available export options and configurations
 *
 * @auth Required
 * @permission export
 *
 * @returns {Promise<NextResponse>} JSON response with export options
 *
 * @example
 * ```http
 * GET /api/export
 * Authorization: Bearer <token>
 * ```
 *
 * @example
 * ```javascript
 * const response = await fetch('/api/export', {
 *   headers: {
 *     'Authorization': 'Bearer ' + token
 *   }
 * });
 * const data = await response.json();
 * // {
 * //   "success": true,
 * //   "data": {
 * //     "formats": ["json", "csv", "xlsx"],
 * //     "default": "json",
 * //     "maxRecords": 10000,
 * //     "fields": [...]
 * //   },
 * //   "timestamp": "2024-01-22T14:30:00Z"
 * // }
 * ```
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async () => {
    try {
      // Export formats configuration
      const exportOptions: ExportOptions = {
        formats: ['json', 'csv'],
        default: 'json',
        maxRecords: 10000,
        fields: [
          'id',
          'title',
          'description',
          'status',
          'priority',
          'dueDate',
          'tags',
          'createdAt',
          'updatedAt'
        ]
      };

      return NextResponse.json({
        success: true,
        data: exportOptions,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Export request failed', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Export request failed',
        },
        { status: 500 }
      );
    }
  });
}
