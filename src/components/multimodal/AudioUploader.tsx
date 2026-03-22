'use client';

/**
 * Audio Uploader Component
 * Supports audio upload, recording, and transcription
 */

import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { TranscriptionData } from '@/lib/multimodal/types';

// Extended MediaRecorder interface with intervalId property
interface MediaRecorderWithInterval extends MediaRecorder {
  intervalId?: ReturnType<typeof setInterval>;
}

interface AudioUploaderProps {
  onAudioSelect: (file: File) => void;
  onTranscriptionResult?: (result: TranscriptionData) => void;
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
  disabled?: boolean;
  placeholder?: string;
  enableRecording?: boolean;
}

export function AudioUploader({
  onAudioSelect,
  onTranscriptionResult,
  maxSize = 50 * 1024 * 1024,
  acceptedTypes = ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4'],
  disabled = false,
  placeholder,
  enableRecording = true,
}: AudioUploaderProps) {
  const t = useTranslations('multimodal');
  const [isDragging, setIsDragging] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const processFile = useCallback(async (file: File) => {
    setError(null);

    // Validate file type
    if (!acceptedTypes.includes(file.type)) {
      setError(t('invalidAudioType', { types: acceptedTypes.join(', ') }));
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      setError(t('audioTooLarge', { maxSize: Math.round(maxSize / 1024 / 1024) }));
      return;
    }

    // Create audio URL
    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    // Notify parent
    onAudioSelect(file);

    // Auto-transcribe if callback provided
    if (onTranscriptionResult) {
      await transcribeAudio(file);
    }
  }, [acceptedTypes, maxSize, onAudioSelect, onTranscriptionResult, t]);

  const transcribeAudio = async (file: File) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('timestamps', 'true');
      formData.append('speakerDiarization', 'true');

      const response = await fetch('/api/multimodal/audio', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        onTranscriptionResult?.(result.data);
      } else {
        setError(result.error || t('transcriptionFailed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('transcriptionFailed'));
    } finally {
      setIsTranscribing(false);
    }
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
        processFile(file);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);

      const interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      (recorder as MediaRecorderWithInterval).intervalId = interval;
    } catch (err) {
      setError(t('recordingError'));
    }
  }, [processFile, t]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      clearInterval((mediaRecorder as MediaRecorderWithInterval).intervalId);
      setIsRecording(false);
      setRecordingTime(0);
      setMediaRecorder(null);
    }
  }, [mediaRecorder]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const clearAudio = () => {
    setAudioUrl(null);
    setError(null);
    stopRecording();
  };

  return (
    <div>
      {audioUrl ? (
        <div className="relative group">
          <audio controls src={audioUrl} className="w-full">
            Your browser does not support the audio element.
          </audio>
          <button
            onClick={clearAudio}
            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={t('clearAudio')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {isTranscribing && (
            <div className="mt-2 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2" />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">{t('transcribing')}</span>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-zinc-300 dark:border-zinc-600'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'}
            `}
          >
            <input
              type="file"
              accept={acceptedTypes.join(',')}
              onChange={handleFileInput}
              disabled={disabled}
              className="hidden"
              id="audio-upload"
            />
            <label htmlFor="audio-upload" className="cursor-pointer">
              <svg
                className="mx-auto h-12 w-12 text-zinc-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {placeholder || t('uploadAudioPlaceholder')}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {t('audioSizeLimit', { maxSize: Math.round(maxSize / 1024 / 1024) })}
              </p>
            </label>

            {enableRecording && (
              <div className="mt-4 border-t border-zinc-200 dark:border-zinc-700 pt-4">
                <p className="text-xs text-zinc-500 mb-2">{t('or')}</p>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={disabled}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${isRecording
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {isRecording ? (
                    <>
                      <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                      {t('stopRecording')} ({formatTime(recordingTime)})
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      {t('startRecording')}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
