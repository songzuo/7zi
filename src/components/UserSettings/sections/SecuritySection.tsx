'use client';

import { useUserSettings } from '../hooks/useUserSettings';
import SectionCard from '../SectionCard';
import { PasswordForm } from '../subcomponents/PasswordForm';

export function SecuritySection() {
  const { security, saveStatus, handleToggle2FA, handleChangePassword } = useUserSettings();

  return (
    <SectionCard title="账户安全" icon="🔒">
      <div className="space-y-8">
        <PasswordForm 
          onSave={async (form) => {
            await handleChangePassword(form.currentPassword, form.newPassword);
          }}
          saveStatus={saveStatus}
        />
        
        {/* Two-Factor Authentication */}
        <div className="pt-6 border-t border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-zinc-900 dark:text-white">两步验证</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                为您的账户添加额外的安全保护
              </p>
            </div>
            <button
              onClick={handleToggle2FA}
              role="switch"
              aria-checked={security.twoFactorEnabled}
              aria-label="两步验证开关"
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${security.twoFactorEnabled 
                  ? 'bg-cyan-500' 
                  : 'bg-zinc-300 dark:bg-zinc-600'
                }
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${security.twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>
          {security.twoFactorEnabled && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <p className="text-green-700 dark:text-green-400 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                两步验证已启用
              </p>
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

export default SecuritySection;