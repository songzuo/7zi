/**
 * i18n 示例页面 - 展示国际化的使用方法
 */

import { LanguageSwitcher } from '@/shared/components';
import { useServerTranslation } from '@/shared/hooks';

export default async function I18nDemoPage() {
  // 服务端翻译示例
  const { t } = await useServerTranslation({ ns: 'common' });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🌍 国际化 (i18n) 示例页面
          </h1>
          <p className="text-gray-600">
            展示 7zi-frontend 国际化功能的完整使用示例
          </p>
        </div>

        {/* 语言切换器示例 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            📱 语言切换器
          </h2>

          <div className="space-y-6">
            {/* Dropdown 模式 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Dropdown 模式 (默认)
              </h3>
              <LanguageSwitcher variant="dropdown" />
            </div>

            {/* Buttons 模式 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Buttons 模式
              </h3>
              <LanguageSwitcher variant="buttons" />
            </div>

            {/* Compact 模式 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Compact 模式
              </h3>
              <LanguageSwitcher variant="compact" />
            </div>
          </div>
        </div>

        {/* 服务端翻译示例 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            🖥️ 服务端翻译示例
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">common:welcome</h3>
              <p className="text-2xl text-blue-600">{t('welcome')}</p>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">common:appName</h3>
              <p className="text-2xl text-green-600">{t('appName')}</p>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">common:settings</h3>
              <p className="text-2xl text-purple-600">{t('settings')}</p>
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">common:dashboard</h3>
              <p className="text-2xl text-orange-600">{t('dashboard')}</p>
            </div>
          </div>
        </div>

        {/* 常用翻译键展示 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            📝 常用翻译键
          </h2>
          
          <div className="grid grid-cols-4 gap-2">
            {[
              'login', 'logout', 'register', 'profile',
              'save', 'cancel', 'delete', 'edit',
              'search', 'filter', 'sort', 'export',
              'loading', 'success', 'error', 'confirm',
              'settings', 'help', 'about', 'feedback',
            ].map((key) => (
              <div key={key} className="border rounded p-2 text-center">
                <div className="text-xs text-gray-500 mb-1">{key}</div>
                <div className="font-medium text-gray-900">{t(key)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 使用说明 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            📚 使用说明
          </h2>
          
          <div className="space-y-4 text-gray-700">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">1. 服务端组件</h3>
              <pre className="bg-gray-100 rounded p-3 text-sm overflow-x-auto">
{`import { useServerTranslation } from '@/shared/hooks';

export default async function Page() {
  const { t } = await useServerTranslation('common');
  return <h1>{t('welcome')}</h1>;
}`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">2. 客户端组件</h3>
              <pre className="bg-gray-100 rounded p-3 text-sm overflow-x-auto">
{`'use client';
import { useTranslation } from 'react-i18next';

export default function ClientComponent() {
  const { t } = useTranslation('common');
  return <h1>{t('welcome')}</h1>;
}`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">3. 语言切换</h3>
              <pre className="bg-gray-100 rounded p-3 text-sm overflow-x-auto">
{`import { LanguageSwitcher } from '@/shared/components';

// Dropdown 模式
<LanguageSwitcher variant="dropdown" />

// Buttons 模式
<LanguageSwitcher variant="buttons" />

// Compact 模式
<LanguageSwitcher variant="compact" />`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
