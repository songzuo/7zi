'use client';

/**
 * 语言切换器组件
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supportedLanguages, languageNames, SupportedLanguage } from '@/lib/i18n/config';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
  /**
   * 显示模式
   * - 'dropdown': 下拉菜单（默认）
   * - 'buttons': 按钮组
   * - 'compact': 紧凑模式
   */
  variant?: 'dropdown' | 'buttons' | 'compact';
  
  /**
   * 是否显示图标
   */
  showIcon?: boolean;
  
  /**
   * 切换回调
   */
  onChange?: (lng: SupportedLanguage) => void;
  
  /**
   * 自定义样式类名
   */
  className?: string;
}

export function LanguageSwitcher({
  variant = 'dropdown',
  showIcon = true,
  onChange,
  className = '',
}: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation('common');
  
  const handleLanguageChange = useCallback((lng: SupportedLanguage) => {
    i18n.changeLanguage(lng);
    document.documentElement.lang = lng;
    onChange?.(lng);
  }, [i18n, onChange]);
  
  if (variant === 'buttons') {
    return (
      <div className={`flex gap-2 ${className}`}>
        {supportedLanguages.map((lng) => (
          <button
            key={lng}
            onClick={() => handleLanguageChange(lng)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${i18n.language === lng
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {languageNames[lng]}
          </button>
        ))}
      </div>
    );
  }
  
  if (variant === 'compact') {
    return (
      <div className={`flex gap-1 ${className}`}>
        {supportedLanguages.map((lng) => (
          <button
            key={lng}
            onClick={() => handleLanguageChange(lng)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors
              ${i18n.language === lng
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            {lng.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }
  
  // Dropdown variant (default)
  return (
    <div className={`relative ${className}`}>
      <select
        value={i18n.language}
        onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
        className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
        aria-label={t('changeLanguage')}
      >
        {supportedLanguages.map((lng) => (
          <option key={lng} value={lng}>
            {languageNames[lng]}
          </option>
        ))}
      </select>
      {showIcon && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <Globe className="w-4 h-4 text-gray-400" />
        </div>
      )}
    </div>
  );
}

export default LanguageSwitcher;
