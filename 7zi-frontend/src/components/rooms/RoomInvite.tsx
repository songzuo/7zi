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

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import QRCode from 'qrcode';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

export interface RoomInviteProps {
  /** Invite code */
  inviteCode: string;
  /** Base URL for invite links */
  baseUrl?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Room Invite Component
 */
export function RoomInvite({
  inviteCode,
  baseUrl = window.location.origin,
  className,
}: RoomInviteProps) {
  const { t } = useTranslation('rooms');
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // Generate invite URL
  const inviteUrl = useMemo(() => {
    return `${baseUrl}/rooms/join?code=${encodeURIComponent(inviteCode)}`;
  }, [inviteCode, baseUrl]);

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
        });
        setQrCodeUrl(url);
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      }
    };

    generateQRCode();
  }, [inviteUrl]);

  // Copy to clipboard
  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, []);

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Invite Code */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('inviteCode')}
        </label>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 rounded text-sm font-mono">
            {inviteCode}
          </code>
          <button
            onClick={() => handleCopy(inviteCode)}
            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded transition-colors"
            type="button"
          >
            {copied ? t('copied') : t('copy')}
          </button>
        </div>
      </div>

      {/* Invite Link */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('inviteLink')}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={inviteUrl}
            className="flex-1 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 rounded text-sm"
          />
          <button
            onClick={() => handleCopy(inviteUrl)}
            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded transition-colors"
            type="button"
          >
            {copied ? t('copied') : t('copy')}
          </button>
        </div>
      </div>

      {/* QR Code */}
      {qrCodeUrl && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
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
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
            Scan to join room
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Invite Card - Minimal version
 */
export function InviteCard({
  inviteCode,
  baseUrl = window.location.origin,
  className,
}: RoomInviteProps) {
  const { t } = useTranslation('rooms');
  const [copied, setCopied] = useState(false);

  const inviteUrl = useMemo(() => {
    return `${baseUrl}/rooms/join?code=${encodeURIComponent(inviteCode)}`;
  }, [inviteCode, baseUrl]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [inviteUrl]);

  return (
    <div className={clsx('bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <code className="text-sm font-mono text-gray-900 dark:text-gray-100 truncate block">
            {inviteCode}
          </code>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {inviteUrl}
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="ml-3 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded transition-colors flex-shrink-0"
          type="button"
        >
          {copied ? t('copied') : t('copy')}
        </button>
      </div>
    </div>
  );
}

export default RoomInvite;
