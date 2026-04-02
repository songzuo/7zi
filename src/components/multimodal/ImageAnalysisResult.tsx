/**
 * Image Analysis Result Component
 * Displays objects, OCR text, and tags detected in images
 */

'use client'

import { useTranslations } from 'next-intl'
import type { ImageData } from '@/lib/multimodal/types'

interface ImageAnalysisResultProps {
  data: ImageData
  className?: string
}

export function ImageAnalysisResult({ data, className = '' }: ImageAnalysisResultProps) {
  const t = useTranslations('multimodal')

  return (
    <div className={`rounded-lg bg-white p-6 shadow-md dark:bg-zinc-800 ${className}`}>
      <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
        {t('analysisResults')}
      </h3>

      {/* Detected Objects */}
      {data.objects && data.objects.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t('detectedObjects')}
          </h4>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {data.objects.map((obj, index) => (
              <div
                key={index}
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-600 dark:bg-zinc-700"
              >
                <div className="text-sm font-medium text-zinc-900 dark:text-white">{obj.label}</div>
                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {t('confidence')}: {(obj.confidence * 100).toFixed(1)}%
                </div>
                <div className="mt-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-600">
                  <div
                    className="h-2 rounded-full bg-blue-500 transition-all duration-300"
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
          <h4 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t('extractedText')}
          </h4>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-600 dark:bg-zinc-700">
            <p className="text-sm whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
              {data.text}
            </p>
          </div>
        </div>
      )}

      {/* Tags */}
      {data.tags && data.tags.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('tags')}</h4>
          <div className="flex flex-wrap gap-2">
            {data.tags.map((tag, index) => (
              <span
                key={index}
                className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Overall Confidence */}
      <div className="border-t border-zinc-200 pt-4 dark:border-zinc-700">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t('overallConfidence')}
          </span>
          <span className="text-sm font-semibold text-zinc-900 dark:text-white">
            {(data.confidence * 100).toFixed(1)}%
          </span>
        </div>
        <div className="h-3 rounded-full bg-zinc-200 dark:bg-zinc-600">
          <div
            className="h-3 rounded-full bg-green-500 transition-all duration-300"
            style={{ width: `${data.confidence * 100}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
        <button
          onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}
          className="flex-1 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
        >
          {t('copyData')}
        </button>
        <button
          onClick={() => {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'image-analysis.json'
            a.click()
            URL.revokeObjectURL(url)
          }}
          className="flex-1 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
        >
          {t('exportJson')}
        </button>
      </div>
    </div>
  )
}
