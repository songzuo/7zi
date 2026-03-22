/**
 * Image Analysis Result Component
 * Displays objects, OCR text, and tags detected in images
 */

'use client';

import { useTranslations } from 'next-intl';
import type { ImageData } from '@/lib/multimodal/types';

interface ImageAnalysisResultProps {
  data: ImageData;
  className?: string;
}

export function ImageAnalysisResult({ data, className = '' }: ImageAnalysisResultProps) {
  const t = useTranslations('multimodal');

  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-white">
        {t('analysisResults')}
      </h3>

      {/* Detected Objects */}
      {data.objects && data.objects.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
            {t('detectedObjects')}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {data.objects.map((obj, index) => (
              <div
                key={index}
                className="bg-zinc-50 dark:bg-zinc-700 rounded-lg p-3 border border-zinc-200 dark:border-zinc-600"
              >
                <div className="font-medium text-zinc-900 dark:text-white text-sm">
                  {obj.label}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {t('confidence')}: {(obj.confidence * 100).toFixed(1)}%
                </div>
                <div className="mt-2 bg-zinc-200 dark:bg-zinc-600 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${obj.confidence * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OCR Text */}
      {data.text && data.text.trim().length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
            {t('extractedText')}
          </h4>
          <div className="bg-zinc-50 dark:bg-zinc-700 rounded-lg p-4 border border-zinc-200 dark:border-zinc-600">
            <p className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
              {data.text}
            </p>
          </div>
        </div>
      )}

      {/* Tags */}
      {data.tags && data.tags.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
            {t('tags')}
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.tags.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Overall Confidence */}
      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t('overallConfidence')}
          </span>
          <span className="text-sm font-semibold text-zinc-900 dark:text-white">
            {(data.confidence * 100).toFixed(1)}%
          </span>
        </div>
        <div className="bg-zinc-200 dark:bg-zinc-600 rounded-full h-3">
          <div
            className="bg-green-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${data.confidence * 100}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-700 flex gap-3">
        <button
          onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}
          className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
        >
          {t('copyData')}
        </button>
        <button
          onClick={() => {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'image-analysis.json';
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          {t('exportJson')}
        </button>
      </div>
    </div>
  );
}
