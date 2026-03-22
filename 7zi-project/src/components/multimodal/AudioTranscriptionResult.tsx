'use client';

/**
 * Audio Transcription Result Component
 * Displays transcribed text, segments, and speaker diarization
 */

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { TranscriptionData } from '@/lib/multimodal/types';

interface AudioTranscriptionResultProps {
  data: TranscriptionData;
  className?: string;
}

export function AudioTranscriptionResult({ data, className = '' }: AudioTranscriptionResultProps) {
  const t = useTranslations('multimodal');
  const [activeSegment, setActiveSegment] = useState<number | null>(null);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        {t('transcriptionResults')}
      </h3>

      {/* Metadata */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {t('language')}
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {data.language}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {t('duration')}
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {Math.floor(data.duration / 60)}:{Math.floor(data.duration % 60).toString().padStart(2, '0')}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {t('confidence')}
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {(data.confidence * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Full Text */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {t('fullText')}
        </h4>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
            {data.text}
          </p>
        </div>
      </div>

      {/* Segments with Timestamps */}
      {data.segments && data.segments.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('segments')}
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {data.segments.map((segment, index) => (
              <div
                key={index}
                onClick={() => setActiveSegment(activeSegment === index ? null : index)}
                className={`
                  rounded-lg p-3 border cursor-pointer transition-colors
                  ${activeSegment === index
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-300'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Timestamp */}
                  <div className="text-xs font-mono text-gray-500 dark:text-gray-400 min-w-[80px]">
                    {formatTime(segment.start)} - {formatTime(segment.end)}
                  </div>

                  {/* Speaker (if available) */}
                  {segment.speaker && (
                    <div className="text-xs font-medium text-blue-600 dark:text-blue-400 min-w-[60px]">
                      {segment.speaker}
                    </div>
                  )}

                  {/* Text */}
                  <div className="flex-1">
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {segment.text}
                    </p>
                  </div>

                  {/* Confidence */}
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {(segment.confidence * 100).toFixed(0)}%
                  </div>
                </div>

                {/* Expanded details */}
                {activeSegment === index && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">
                          {t('startTime')}:
                        </span>
                        <span className="ml-2 font-mono">{segment.start.toFixed(2)}s</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">
                          {t('endTime')}:
                        </span>
                        <span className="ml-2 font-mono">{segment.end.toFixed(2)}s</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">
                          {t('segmentConfidence')}:
                        </span>
                        <span className="ml-2">{(segment.confidence * 100).toFixed(1)}%</span>
                      </div>
                      {segment.speaker && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">
                            {t('speaker')}:
                          </span>
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
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
        <button
          onClick={() => navigator.clipboard.writeText(data.text)}
          className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          {t('copyText')}
        </button>
        <button
          onClick={() => {
            const blob = new Blob([data.text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'transcription.txt';
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          {t('exportTxt')}
        </button>
        <button
          onClick={() => {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'transcription.json';
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
        >
          {t('exportJson')}
        </button>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
