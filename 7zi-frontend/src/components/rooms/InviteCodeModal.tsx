/**
 * Invite Code Modal Component
 *
 * Modal for displaying and sharing room invite codes
 *
 * Features:
 * - Display invite code with copy button
 * - Generate invite link with copy functionality
 * - QR code generation for mobile scanning
 * - Expiration time display (if applicable)
 * - Share functionality (Web Share API)
 * - Dark/light mode support
 */

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import clsx from 'clsx';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface InviteCodeModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close modal callback */
  onClose: () => void;
  /** Invite code to display */
  inviteCode: string;
  /** Room name for display */
  roomName?: string;
  /** Base URL for invite links */
  baseUrl?: string;
  /** Expiration timestamp (optional) */
  expiresAt?: number;
  /** Max uses (optional) */
  maxUses?: number;
  /** Current uses count (optional) */
  currentUses?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Copy state type
 */
type CopyState = 'idle' | 'copied' | 'error';

/**
 * Invite Code Modal Component
 */
export function InviteCodeModal({
  isOpen,
  onClose,
  inviteCode,
  roomName,
  baseUrl,
  expiresAt,
  maxUses,
  currentUses = 0,
  className,
}: InviteCodeModalProps) {
  const { t } = useTranslation('rooms');

  // State
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [codeCopyState, setCodeCopyState] = useState<CopyState>('idle');
  const [linkCopyState, setLinkCopyState] = useState<CopyState>('idle');

  // Generate invite URL
  const inviteUrl = useMemo(() => {
    const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}/rooms/join?code=${encodeURIComponent(inviteCode)}`;
  }, [inviteCode, baseUrl]);

  // Generate QR code
  useEffect(() => {
    if (!isOpen) return;

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
  }, [inviteUrl, isOpen]);

  /**
   * Copy text to clipboard
   */
  const copyToClipboard = useCallback(async (text: string, type: 'code' | 'link') => {
    const setState = type === 'code' ? setCodeCopyState : setLinkCopyState;

    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
      setTimeout(() => setState('idle'), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      setState('error');
      setTimeout(() => setState('idle'), 2000);
    }
  }, []);

  /**
   * Share invite (Web Share API)
   */
  const handleShare = useCallback(async () => {
    if (!navigator.share) {
      // Fallback to copy link
      await copyToClipboard(inviteUrl, 'link');
      return;
    }

    try {
      await navigator.share({
        title: roomName ? `${t('inviteTo')} ${roomName}` : t('invite', '邀请'),
        text: `${t('joinRoom', '加入我的房间')}: ${roomName || ''}`,
        url: inviteUrl,
      });
    } catch (error) {
      // User cancelled or share failed
      if ((error as Error).name !== 'AbortError') {
        console.error('Share failed:', error);
      }
    }
  }, [inviteUrl, roomName, t, copyToClipboard]);

  /**
   * Format expiration time
   */
  const formatExpiration = useCallback((timestamp: number): string => {
    const now = Date.now();
    const diff = timestamp - now;

    if (diff <= 0) {
      return t('expired', '已过期');
    }

    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return t('expiresInDays', '{{days}}天后过期', { days });
    }
    if (hours > 0) {
      return t('expiresInHours', '{{hours}}小时后过期', { hours });
    }
    return t('expiresSoon', '即将过期');
  }, [t]);

  /**
   * Check if expired
   */
  const isExpired = expiresAt && Date.now() > expiresAt;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('invite', '邀请')}
      size="md"
      className={className}
    >
      <div className="space-y-5">
        {/* Room Name Header */}
        {roomName && (
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('inviteToRoom', '邀请加入房间')}
            </p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-1">
              {roomName}
            </h3>
          </div>
        )}

        {/* Expiration Info */}
        {(expiresAt || maxUses) && (
          <div className="flex items-center justify-center gap-4 text-sm">
            {expiresAt && (
              <div className={clsx(
                'flex items-center gap-1',
                isExpired ? 'text-red-500' : 'text-amber-600 dark:text-amber-400'
              )}>
                <span>⏰</span>
                <span>{formatExpiration(expiresAt)}</span>
              </div>
            )}
            {maxUses && (
              <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <span>👥</span>
                <span>{t('uses', '使用次数')}: {currentUses}/{maxUses}</span>
              </div>
            )}
          </div>
        )}

        {/* Invite Code */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('inviteCode', '邀请码')}
          </label>
          <div className="flex items-center gap-2">
            <code className={clsx(
              'flex-1 bg-white dark:bg-gray-800 px-4 py-3 rounded text-center',
              'text-xl font-mono tracking-widest',
              'text-gray-900 dark:text-gray-100',
              'border border-gray-200 dark:border-gray-700'
            )}>
              {inviteCode}
            </code>
            <button
              onClick={() => copyToClipboard(inviteCode, 'code')}
              disabled={codeCopyState === 'copied'}
              className={clsx(
                'px-4 py-3 rounded font-medium transition-all',
                codeCopyState === 'copied'
                  ? 'bg-green-500 text-white'
                  : codeCopyState === 'error'
                  ? 'bg-red-500 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              )}
              type="button"
            >
              {codeCopyState === 'copied' ? '✓' : codeCopyState === 'error' ? '!' : t('copy', '复制')}
            </button>
          </div>
        </div>

        {/* Invite Link */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('inviteLink', '邀请链接')}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className={clsx(
                'flex-1 bg-white dark:bg-gray-800 px-3 py-2 rounded',
                'text-sm text-gray-900 dark:text-gray-100',
                'border border-gray-200 dark:border-gray-700',
                'truncate'
              )}
            />
            <button
              onClick={() => copyToClipboard(inviteUrl, 'link')}
              disabled={linkCopyState === 'copied'}
              className={clsx(
                'px-3 py-2 rounded text-sm font-medium transition-all',
                linkCopyState === 'copied'
                  ? 'bg-green-500 text-white'
                  : linkCopyState === 'error'
                  ? 'bg-red-500 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              )}
              type="button"
            >
              {linkCopyState === 'copied' ? '✓' : linkCopyState === 'error' ? '!' : t('copy', '复制')}
            </button>
          </div>
        </div>

        {/* QR Code */}
        {qrCodeUrl && (
          <div className="text-center">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('scanToJoin', '扫码加入')}
            </label>
            <div className="inline-block p-4 bg-white rounded-lg border border-gray-200 dark:border-gray-700">
              <img
                src={qrCodeUrl}
                alt="QR Code"
                className="rounded"
                width={200}
                height={200}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t('scanQRDesc', '使用手机扫描二维码快速加入房间')}
            </p>
          </div>
        )}

        {/* Share Button */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            {t('close', '关闭')}
          </Button>
          <Button
            variant="primary"
            onClick={handleShare}
            className="flex-1"
          >
            {t('share', '分享')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default InviteCodeModal;
