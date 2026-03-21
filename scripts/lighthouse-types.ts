/**
 * Lighthouse Report Type Definitions
 *
 * TypeScript types for Lighthouse audit results
 */

/**
 * Lighthouse audit score (0-1 scale)
 */
export type LighthouseScore = number;

/**
 * Lighthouse audit details (varies by audit type)
 * Common detail types used by Lighthouse
 */
export type LighthouseAuditDetails =
  | TableDetails
  | DebugData
  | OpportunitiesDetails
  | DiagnosticsDetails
  | null;

/**
 * Table details (for most audits)
 */
export interface TableDetails {
  type: 'table';
  headings: Array<{ key: string; valueType: string; label: string }>;
  items: Array<Record<string, unknown>>;
}

/**
 * Debug data details
 */
export interface DebugData {
  type: 'debugdata';
  items: Array<Record<string, unknown>>;
}

/**
 * Opportunities details
 */
export interface OpportunitiesDetails {
  type: 'opportunity';
  headings: Array<{ key: string; valueType: string; label: string }>;
  items: Array<Record<string, unknown>>;
  overallSavingsMs: number;
}

/**
 * Diagnostics details
 */
export interface DiagnosticsDetails {
  type: 'diagnostic';
  headings: Array<{ key: string; valueType: string; label: string }>;
  items: Array<Record<string, unknown>>;
}

/**
 * Lighthouse audit entry
 */
export interface LighthouseAudit {
  id: string;
  title: string;
  description: string;
  score: LighthouseScore | null;
  displayValue?: string;
  numericValue?: number;
  details?: LighthouseAuditDetails;
}

/**
 * Lighthouse category
 */
export interface LighthouseCategory {
  id: string;
  title: string;
  score: LighthouseScore;
  description?: string;
}

/**
 * Lighthouse report categories
 */
export interface LighthouseCategories {
  performance: LighthouseCategory;
  accessibility: LighthouseCategory;
  'best-practices': LighthouseCategory;
  seo: LighthouseCategory;
}

/**
 * Lighthouse audit collection
 */
export type LighthouseAudits = Record<string, LighthouseAudit>;

/**
 * Lighthouse full report
 */
export interface LighthouseReport {
  categories: LighthouseCategories;
  audits: LighthouseAudits;
  categories?: Record<string, any>;
  audits?: Record<string, any>;
}

/**
 * Extracted metrics
 */
export interface ExtractedMetrics {
  'First Contentful Paint': string;
  'Speed Index': string;
  'Largest Contentful Paint': string;
  'Time to Interactive': string;
  'Total Blocking Time': string;
  'Cumulative Layout Shift': string;
}

/**
 * Extracted issue
 */
export interface ExtractedIssue {
  title: string;
  description: string;
  score: LighthouseScore;
  displayValue?: string;
}

/**
 * Parsed Lighthouse results
 */
export interface ParsedLighthouseResults {
  scores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  metrics: ExtractedMetrics;
  issues: ExtractedIssue[];
}

/**
 * Performance status
 */
export type PerformanceStatus = 'excellent' | 'good' | 'needs-improvement' | 'poor';

/**
 * Generated performance report
 */
export interface PerformanceReport {
  timestamp: string;
  scores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  metrics: ExtractedMetrics;
  issues: ExtractedIssue[];
  status: PerformanceStatus;
}
