/**
 * Form status message component
 */
'use client';

import { useTranslations } from 'next-intl';

interface FormStatusProps {
  status: 'idle' | 'success' | 'error';
}

export function FormStatus({ status }: FormStatusProps) {
  const t = useTranslations('contact.form');

  if (status === 'idle') return null;

  if (status === 'success') {
    return (
      <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl">
        <p className="text-green-700 dark:text-green-400 flex items-center gap-2">
          <span>✅</span>
          {t('success')}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
      <p className="text-red-700 dark:text-red-400 flex items-center gap-2">
        <span>❌</span>
        {t('error')}
      </p>
    </div>
  );
}