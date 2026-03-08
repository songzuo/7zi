'use client';

import { useCallback } from 'react';
import type { PrivacySettings } from '../types';
import SectionCard from '../SectionCard';
import PrivacyOption from '../subcomponents/PrivacyOption';

const VISIBILITY_OPTIONS = [
  { value: 'public' as const, label: '公开', desc: '所有人可见' },
  { value: 'friends' as const, label: '仅好友', desc: '仅好友可见' },
  { value: 'private' as const, label: '私密', desc: '仅自己可见' },
];

interface PrivacySectionProps {
  privacy: PrivacySettings;
  setPrivacy: (privacy: PrivacySettings) => void;
}

export function PrivacySection({ privacy, setPrivacy }: PrivacySectionProps) {
  const handlePrivacyChange = useCallback((key: keyof PrivacySettings, value?: boolean | string) => {
    setPrivacy({
      ...privacy,
      [key]: value !== undefined ? value : !privacy[key],
    });
  }, [privacy, setPrivacy]);

  return (
    <SectionCard title="隐私设置" icon="🛡️">
      <div className="space-y-6">
        {/* Profile Visibility */}
        <div>
          <h4 className="font-medium text-zinc-900 dark:text-white mb-3">个人资料可见性</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {VISIBILITY_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => handlePrivacyChange('profileVisibility', option.value)}
                className={`
                  p-4 rounded-xl border-2 text-left transition-all
                  ${privacy.profileVisibility === option.value
                    ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                  }
                `}
              >
                <div className="font-medium text-zinc-900 dark:text-white">{option.label}</div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">{option.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Other Privacy Options */}
        <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <PrivacyOption
            label="显示邮箱地址"
            description="在个人主页显示您的邮箱"
            checked={privacy.showEmail}
            onChange={() => handlePrivacyChange('showEmail')}
          />
          
          <PrivacyOption
            label="显示活动状态"
            description="让其他人看到您的在线状态"
            checked={privacy.showActivity}
            onChange={() => handlePrivacyChange('showActivity')}
          />
          
          <PrivacyOption
            label="允许私信"
            description="允许其他用户给您发送私信"
            checked={privacy.allowMessages}
            onChange={() => handlePrivacyChange('allowMessages')}
          />
          
          <PrivacyOption
            label="数据收集"
            description="允许收集匿名使用数据以改进产品"
            checked={privacy.dataCollection}
            onChange={() => handlePrivacyChange('dataCollection')}
          />
        </div>
      </div>
    </SectionCard>
  );
}

export default PrivacySection;