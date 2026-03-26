'use client';

/**
 * PageLoadWaterfall Component
 * 页面加载瀑布流组件
 *
 * 可视化展示资源和关键时间点的加载时序
 */

import React, { useMemo } from 'react';
import { Clock, FileText, Image, Subscript, Layout as LayoutIcon, Globe, ChevronDown, ChevronRight, Code } from 'lucide-react';
import type { MetricEntry } from '@/lib/hooks/useWebVitals';

// ============================================
// Type Definitions
// ============================================

export interface ResourceTiming {
  name: string;
  initiatorType: string;
  duration: number;
  startTime: number;
  size?: number;
  domain?: string;
}

export interface CriticalTiming {
  name: string;
  startTime: number;
  duration: number;
  color: string;
}

export interface PageLoadWaterfallProps {
  metrics: {
    FCP?: number;
    LCP?: number;
    TTFB?: number;
    FID?: number;
  };
  history?: MetricEntry[];
  locale?: 'en' | 'zh';
  showDetails?: boolean;
  maxResources?: number;
  className?: string;
}

// ============================================
// Constants
// ============================================

const TIMING_COLORS = {
  TTFB: '#3b82f6', // blue
  FCP: '#10b981', // green
  LCP: '#8b5cf6', // purple
  FID: '#f59e0b', // amber
  DOM: '#06b6d4', // cyan
  Load: '#ec4899', // pink
};

const RESOURCE_ICONS = {
  script: Subscript,
  link: LayoutIcon,
  img: Image,
  css: LayoutIcon,
  fetch: Globe,
  xmlhttprequest: Globe,
  other: FileText,
};

const RESOURCE_COLORS = {
  script: '#f59e0b',
  link: '#3b82f6',
  img: '#10b981',
  css: '#8b5cf6',
  fetch: '#ec4899',
  xmlhttprequest: '#06b6d4',
  other: '#6b7280',
};

// ============================================
// Helper Functions
// ============================================

function formatDuration(ms: number): string {
  if (ms < 100) return `${ms.toFixed(0)}ms`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function getResourceIcon(type: string): React.ComponentType<{ className?: string; style?: React.CSSProperties }> {
  const icon = RESOURCE_ICONS[type as keyof typeof RESOURCE_ICONS];
  return icon || RESOURCE_ICONS.other;
}

// ============================================
// Mock Resource Timing (since performance API is not available)
// ============================================

function getMockResourceTimings(count: number = 20): ResourceTiming[] {
  const types = ['script', 'link', 'img', 'css', 'fetch'];
  const resources: ResourceTiming[] = [];

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const startTime = Math.random() * 2000;
    const duration = Math.random() * 500 + 50;

    resources.push({
      name: type === 'img' ? `/image-${i}.webp` :
             type === 'script' ? `/script-${i}.js` :
             type === 'css' ? `/style-${i}.css` :
             type === 'link' ? `/page-${i}.html` :
             `/api/data-${i}`,
      initiatorType: type,
      duration,
      startTime,
      size: Math.floor(Math.random() * 500000) + 1000,
      domain: '7zi.com',
    });
  }

  return resources.sort((a, b) => a.startTime - b.startTime);
}

// ============================================
// Sub-components
// ============================================

interface TimingBarProps {
  timing: CriticalTiming;
  totalDuration: number;
  locale: 'en' | 'zh';
}

const TimingBar: React.FC<TimingBarProps> = ({ timing, totalDuration, locale }) => {
  const leftPercent = (timing.startTime / totalDuration) * 100;
  const widthPercent = (timing.duration / totalDuration) * 100;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-zinc-600 dark:text-zinc-400">{timing.name}</span>
      <div className="flex-1 h-6 bg-zinc-100 dark:bg-zinc-700 rounded relative overflow-hidden">
        <div
          className="absolute h-full rounded-sm"
          style={{
            left: `${leftPercent}%`,
            width: `${Math.max(widthPercent, 1)}%`,
            backgroundColor: timing.color,
          }}
        />
      </div>
      <span className="w-16 text-right text-zinc-600 dark:text-zinc-400">
        {formatDuration(timing.startTime)}
      </span>
    </div>
  );
};

interface ResourceRowProps {
  resource: ResourceTiming;
  totalDuration: number;
  showDetails: boolean;
  locale: 'en' | 'zh';
}

const ResourceRow: React.FC<ResourceRowProps> = ({ resource, totalDuration, showDetails, locale }) => {
  const Icon = getResourceIcon(resource.initiatorType);
  const color = RESOURCE_COLORS[resource.initiatorType as keyof typeof RESOURCE_COLORS] || RESOURCE_COLORS.other;
  const leftPercent = (resource.startTime / totalDuration) * 100;
  const widthPercent = (resource.duration / totalDuration) * 100;

  return (
    <div className="group flex items-center gap-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-700/50 rounded py-1">
      <div className="w-8 flex items-center justify-center" style={{ color }}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0 truncate text-zinc-700 dark:text-zinc-300">
        {resource.name}
      </div>
      {showDetails && (
        <div className="w-24 text-right text-zinc-500 dark:text-zinc-400">
          {formatBytes(resource.size)}
        </div>
      )}
      <div className="w-16 text-right text-zinc-600 dark:text-zinc-400">
        {formatDuration(resource.duration)}
      </div>
      <div className="flex-1 h-5 bg-zinc-100 dark:bg-zinc-700 rounded relative overflow-hidden">
        <div
          className="absolute h-full rounded-sm"
          style={{
            left: `${leftPercent}%`,
            width: `${Math.max(widthPercent, 1)}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
};

// ============================================
// Main Component
// ============================================

export const PageLoadWaterfall: React.FC<PageLoadWaterfallProps> = ({
  metrics,
  history = [],
  locale = 'en',
  showDetails = true,
  maxResources = 15,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const t = {
    title: locale === 'zh' ? '页面加载瀑布流' : 'Page Load Waterfall',
    criticalTimings: locale === 'zh' ? '关键时间点' : 'Critical Timings',
    resources: locale === 'zh' ? '资源加载' : 'Resources',
    size: locale === 'zh' ? '大小' : 'Size',
    duration: locale === 'zh' ? '耗时' : 'Duration',
    totalDuration: locale === 'zh' ? '总时长' : 'Total Duration',
    showMore: locale === 'zh' ? '显示更多' : 'Show more',
    showLess: locale === 'zh' ? '显示更少' : 'Show less',
    noData: locale === 'zh' ? '暂无数据' : 'No data',
  };

  // Calculate critical timings
  const criticalTimings = useMemo((): CriticalTiming[] => {
    const timings: CriticalTiming[] = [];

    if (metrics.TTFB) {
      timings.push({
        name: 'TTFB',
        startTime: 0,
        duration: metrics.TTFB,
        color: TIMING_COLORS.TTFB,
      });
    }

    if (metrics.FCP) {
      timings.push({
        name: 'FCP',
        startTime: metrics.TTFB || 0,
        duration: Math.max(0, metrics.FCP - (metrics.TTFB || 0)),
        color: TIMING_COLORS.FCP,
      });
    }

    if (metrics.LCP) {
      timings.push({
        name: 'LCP',
        startTime: metrics.FCP || (metrics.TTFB || 0),
        duration: Math.max(0, metrics.LCP - Math.max(metrics.FCP || 0, metrics.TTFB || 0)),
        color: TIMING_COLORS.LCP,
      });
    }

    if (metrics.FID) {
      timings.push({
        name: 'FID',
        startTime: metrics.LCP || metrics.FCP || (metrics.TTFB || 0),
        duration: metrics.FID,
        color: TIMING_COLORS.FID,
      });
    }

    return timings;
  }, [metrics]);

  // Calculate total duration
  const totalDuration = useMemo(() => {
    const lastTiming = criticalTimings[criticalTimings.length - 1];
    return lastTiming ? lastTiming.startTime + lastTiming.duration : 5000;
  }, [criticalTimings]);

  // Get resource timings
  const resourceTimings = useMemo(() => {
    return getMockResourceTimings(maxResources);
  }, [maxResources]);

  if (criticalTimings.length === 0) {
    return (
      <div className={`bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6 ${className}`}>
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <Clock className="w-8 h-8 text-zinc-400 mb-2" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.noData}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
            {t.title}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {t.totalDuration}: {formatDuration(totalDuration)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Color legend */}
          <div className="flex items-center gap-3 text-xs">
            {Object.entries(TIMING_COLORS).map(([name, color]) => (
              <div key={name} className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-zinc-600 dark:text-zinc-400">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Critical Timings */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
          {t.criticalTimings}
        </h4>
        <div className="space-y-2">
          {criticalTimings.map((timing) => (
            <TimingBar
              key={timing.name}
              timing={timing}
              totalDuration={totalDuration}
              locale={locale}
            />
          ))}
        </div>
      </div>

      {/* Resources */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t.resources}
          </h4>
          {resourceTimings.length > maxResources && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {isExpanded ? t.showLess : t.showMore}
            </button>
          )}
        </div>

        {/* Resource header */}
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-2 px-2">
          <div className="w-8" />
          <div className="flex-1">{locale === 'zh' ? '名称' : 'Name'}</div>
          {showDetails && (
            <div className="w-24 text-right">{t.size}</div>
          )}
          <div className="w-16 text-right">{t.duration}</div>
          <div className="flex-1">{locale === 'zh' ? '时间轴' : 'Timeline'}</div>
        </div>

        {/* Resource list */}
        <div className="max-h-64 overflow-y-auto space-y-0.5">
          {(isExpanded ? resourceTimings : resourceTimings.slice(0, maxResources)).map((resource, index) => (
            <ResourceRow
              key={index}
              resource={resource}
              totalDuration={totalDuration}
              showDetails={showDetails}
              locale={locale}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PageLoadWaterfall;
