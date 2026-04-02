/**
 * Room Invite Component
 *
 * Displays invite code, invite link, and QR code
 * One-click copy functionality for easy sharing
 *
 * Features:
 * - Display invite code and link
 * - Generate QR code (using qrcode library)
 * - One-click copy functionality
 * - Dark/light mode support
 */

'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import QRCode from 'qrcode'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'

export interface RoomInviteProps {
  /** Invite code */
  inviteCode: string
  /** Base URL for invite links */
  baseUrl?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * Room Invite Component
 */
export function RoomInvite({
  inviteCode,
  baseUrl = window.location.origin,
  className,
}: RoomInviteProps) {
  const { t } = useTranslation('rooms')
  const [copied, setCopied] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')

  // Generate invite URL
  const inviteUrl = useMemo(() => {
    return `${baseUrl}/rooms/join?code=${encodeURIComponent(inviteCode)}`
  }, [inviteCode, baseUrl])

  // Generate QR code
  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const url = await QRCode.toDataURL(inviteUrl, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        })
        setQrCodeUrl(url)
      } catch (error) {
        console.error('Failed to generate QR code:', error)
      }
    }

    generateQRCode()
  }, [inviteUrl])

  // Copy to clipboard
  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }, [])

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Invite Code */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('inviteCode')}
        </label>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded bg-gray-100 px-3 py-2 font-mono text-sm text-gray-900 dark:bg-gray-900 dark:text-gray-100">
            {inviteCode}
          </code>
          <button
            onClick={() => handleCopy(inviteCode)}
            className="rounded bg-blue-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            type="button"
          >
            {copied ? t('copied') : t('copy')}
          </button>
        </div>
      </div>

      {/* Invite Link */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('inviteLink')}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={inviteUrl}
            className="flex-1 rounded bg-gray-100 px-3 py-2 text-sm text-gray-900 dark:bg-gray-900 dark:text-gray-100"
          />
          <button
            onClick={() => handleCopy(inviteUrl)}
            className="rounded bg-blue-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            type="button"
          >
            {copied ? t('copied') : t('copy')}
          </button>
        </div>
      </div>

      {/* QR Code */}
      {qrCodeUrl && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('share')}
          </label>
          <div className="flex items-center justify-center">
            <img
              src={qrCodeUrl}
              alt="QR Code"
              className="rounded-lg border border-gray-200 dark:border-gray-700"
              width={200}
              height={200}
            />
          </div>
          <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
            Scan to join room
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Compact Invite Card - Minimal version
 */
export function InviteCard({
  inviteCode,
  baseUrl = window.location.origin,
  className,
}: RoomInviteProps) {
  const { t } = useTranslation('rooms')
  const [copied, setCopied] = useState(false)

  const inviteUrl = useMemo(() => {
    return `${baseUrl}/rooms/join?code=${encodeURIComponent(inviteCode)}`
  }, [inviteCode, baseUrl])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }, [inviteUrl])

  return (
    <div
      className={clsx(
        'rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <code className="block truncate font-mono text-sm text-gray-900 dark:text-gray-100">
            {inviteCode}
          </code>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">{inviteUrl}</p>
        </div>
        <button
          onClick={handleCopy}
          className="ml-3 flex-shrink-0 rounded bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-600"
          type="button"
        >
          {copied ? t('copied') : t('copy')}
        </button>
      </div>
    </div>
  )
}

export default RoomInvite
