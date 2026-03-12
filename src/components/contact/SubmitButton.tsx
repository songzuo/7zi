/**
 * Form submit button with loading state
 */
'use client';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface SubmitButtonProps {
  isSubmitting: boolean;
  label: string;
  loadingLabel: string;
}

export function SubmitButton({ isSubmitting, label, loadingLabel }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className={`w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-2xl font-semibold text-lg transition-all duration-300 ${
        isSubmitting
          ? 'opacity-70 cursor-not-allowed'
          : 'hover:shadow-lg hover:scale-[1.02]'
      }`}
    >
      {isSubmitting ? (
        <span className="flex items-center justify-center gap-2">
          <LoadingSpinner />
          {loadingLabel}
        </span>
      ) : (
        label
      )}
    </button>
  );
}