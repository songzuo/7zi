'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { locales, localeNames, localeFlags, type Locale } from '../i18n/config';

interface LanguageSwitcherProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  size = 'md',
  className = ''
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 从路径中检测当前语言
  const getCurrentLocale = (): Locale => {
    const pathLocale = pathname?.split('/')[1];
    if (pathLocale === 'en') return 'en';
    return 'zh';
  };

  const currentLocale = getCurrentLocale();

  // 切换语言
  const changeLocale = (newLocale: Locale) => {
    if (newLocale === currentLocale) {
      setIsOpen(false);
      return;
    }

    // 构建新路径
    let newPath = pathname || '/';
    
    if (currentLocale === 'zh' && newLocale === 'en') {
      // 中文切英文：添加 /en 前缀
      newPath = `/en${newPath}`;
    } else if (currentLocale === 'en' && newLocale === 'zh') {
      // 英文切中文：移除 /en 前缀
      newPath = newPath.replace(/^\/en/, '') || '/';
    }

    setIsOpen(false);
    router.push(newPath);
  };

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ESC 关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const iconSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-1.5 rounded-lg
          bg-gray-100 dark:bg-gray-800
          hover:bg-gray-200 dark:hover:bg-gray-700
          text-gray-700 dark:text-gray-300
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
          ${sizeClasses[size]}
        `}
        aria-label={`切换语言，当前：${localeNames[currentLocale]}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className={iconSizes[size]}>{localeFlags[currentLocale]}</span>
        <span className="hidden sm:inline">{localeNames[currentLocale]}</span>
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="
            absolute right-0 mt-1
            min-w-[120px]
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700
            rounded-lg shadow-lg
            overflow-hidden
            z-50
          "
          role="listbox"
          aria-label="选择语言"
        >
          {locales.map((locale) => (
            <button
              key={locale}
              type="button"
              onClick={() => changeLocale(locale)}
              className={`
                w-full flex items-center gap-2 px-3 py-2 text-sm
                transition-colors duration-200
                ${
                  locale === currentLocale
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
              role="option"
              aria-selected={locale === currentLocale}
            >
              <span>{localeFlags[locale]}</span>
              <span>{localeNames[locale]}</span>
              {locale === currentLocale && (
                <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
