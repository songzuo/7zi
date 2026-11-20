'use client'

/**
 * Audio Transcription Result Component
 * Displays transcribed text, segments, and speaker diarization
 */

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { TranscriptionData } from '@/lib/multimodal/types'

interface AudioTranscriptionResultProps {
  data: TranscriptionData
  className?: string
}

export function AudioTranscriptionResult({ data, className = '' }: AudioTranscriptionResultProps) {
  const t = useTranslations('multimodal')
  const [activeSegment, setActiveSegment] = useState<number | null>(null)

  return (
    <div className={`rounded-lg bg-white p-6 shadow-md dark:bg-zinc-800 ${className}`}>
      <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
        {t('transcriptionResults')}
      </h3>

      {/* Metadata */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-700">
          <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">{t('language')}</div>
          <div className="text-sm font-semibold text-zinc-900 dark:text-white">{data.language}</div>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-700">
          <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">{t('duration')}</div>
          <div className="text-sm font-semibold text-zinc-900 dark:text-white">
            {Math.floor(data.duration / 60)}:
            {Math.floor(data.duration % 60)
              .toString()
              .padStart(2, '0')}
          </div>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-700">
          <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">{t('confidence')}</div>
          <div className="text-sm font-semibold text-zinc-900 dark:text-white">
            {(data.confidence * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Full Text */}
      <div className="mb-6">
        <h4 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t('fullText')}
        </h4>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-600 dark:bg-zinc-700">
          <p className="text-sm whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
            {data.text}
          </p>
        </div>
      </div>

      {/* Segments with Timestamps */}
      {data.segments && data.segments.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t('segments')}
          </h4>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {data.segments.map((segment, index) => (
              <div
                key={index}
                onClick={() => setActiveSegment(activeSegment === index ? null : index)}
                className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                  activeSegment === index
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-zinc-200 bg-zinc-50 hover:border-blue-300 dark:border-zinc-600 dark:bg-zinc-700'
                } `}
              >
                <div className="flex items-start gap-3">
                  {/* Timestamp */}
                  <div className="min-w-[80px] font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {formatTime(segment.start)} - {formatTime(segment.end)}
                  </div>

                  {/* Speaker (if available) */}
                  {segment.speaker && (
                    <div className="min-w-[60px] text-xs font-medium text-blue-600 dark:text-blue-400">
                      {segment.speaker}
                    </div>
                  )}

                  {/* Text */}
                  <div className="flex-1">
                    <p className="text-sm text-zinc-800 dark:text-zinc-200">{segment.text}</p>
                  </div>

                  {/* Confidence */}
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {(segment.confidence * 100).toFixed(0)}%
                  </div>
                </div>

                {/* Expanded details */}
                {activeSegment === index && (
                  <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-600">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-zinc-500 dark:text-zinc-400">{t('startTime')}:</span>
                        <span className="ml-2 font-mono">{segment.start.toFixed(2)}s</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 dark:text-zinc-400">{t('endTime')}:</span>
                        <span className="ml-2 font-mono">{segment.end.toFixed(2)}s</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 dark:text-zinc-400">
                          {t('segmentConfidence')}:
                        </span>
                        <span className="ml-2">{(segment.confidence * 100).toFixed(1)}%</span>
                      </div>
                      {segment.speaker && (
                        <div>
                          <span className="text-zinc-500 dark:text-zinc-400">{t('speaker')}:</span>
                          <span className="ml-2">{segment.speaker}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
        <button
          onClick={() => navigator.clipboard.writeText(data.text)}
          className="flex-1 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
        >
          {t('copyText')}
        </button>
        <button
          onClick={() => {
            const blob = new Blob([data.text], { type: 'text/plain' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'transcription.txt'
            a.click()
            URL.revokeObjectURL(url)
          }}
          className="flex-1 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
        >
          {t('exportTxt')}
        </button>
        <button
          onClick={() => {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'transcription.json'
            a.click()
            URL.revokeObjectURL(url)
          }}
          className="flex-1 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
        >
          {t('exportJson')}
        </button>
      </div>
    </div>
  )
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
