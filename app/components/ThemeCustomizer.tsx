'use client';

import React, { useState } from 'react';
import { useThemeCustomization, PRESET_THEMES, ThemeColors } from '../hooks/useThemeCustomization';

/**
 * 颜色选择器属性
 */
interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

/**
 * 颜色选择器组件
 */
function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
          aria-label={`选择${label}颜色`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          aria-label={`${label}颜色值`}
        />
      </div>
    </div>
  );
}

/**
 * 滑块组件
 */
interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

function Slider({ label, value, min, max, step = 1, unit = '', onChange }: SliderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <div className="flex items-center gap-3">
        <input
          type="range"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
          aria-label={label}
        />
        <span className="w-16 text-sm text-gray-600 dark:text-gray-400 text-right">
          {value}{unit}
        </span>
      </div>
    </div>
  );
}

/**
 * 主题定制器组件
 */
export function ThemeCustomizer() {
  const {
    currentTheme,
    availableThemes,
    presetThemes,
    mounted,
    setTheme,
    customizeColors,
    customizeSpacing,
    customizeRadius,
    setFontFamily,
    setAnimationSpeed,
    saveAsCustomTheme,
    resetTheme,
    exportTheme,
    importTheme,
  } = useThemeCustomization();

  const [activeTab, setActiveTab] = useState<'presets' | 'colors' | 'spacing' | 'advanced'>('presets');
  const [newThemeName, setNewThemeName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!mounted) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  // 导出主题
  const handleExport = () => {
    const json = exportTheme();
    navigator.clipboard.writeText(json).then(() => {
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2000);
    });
  };

  // 导入主题
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const text = await file.text();
      const result = importTheme(text);
      
      if (result.success) {
        setImportError(null);
      } else {
        setImportError(result.error || '导入失败');
        setTimeout(() => setImportError(null), 3000);
      }
    };
    input.click();
  };

  // 保存自定义主题
  const handleSaveCustom = () => {
    if (!newThemeName.trim()) return;
    saveAsCustomTheme(newThemeName.trim());
    setNewThemeName('');
    setShowSaveDialog(false);
  };

  const tabs = [
    { id: 'presets', label: '预设主题', icon: '🎨' },
    { id: 'colors', label: '颜色', icon: '🌈' },
    { id: 'spacing', label: '间距', icon: '📐' },
    { id: 'advanced', label: '高级', icon: '⚙️' },
  ] as const;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transition-colors">
      {/* 标题 */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <span aria-hidden="true">🎭</span>
          主题定制
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          自定义应用的外观和感觉
        </p>
      </div>

      {/* 标签页 */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors
                focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500
                ${activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
              aria-selected={activeTab === tab.id}
              role="tab"
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-6">
        {/* 预设主题 */}
        {activeTab === 'presets' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              选择一个预设主题开始定制
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.values(presetThemes).map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setTheme(theme.id)}
                  className={`
                    p-4 rounded-xl border-2 text-left transition-all
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    ${currentTheme.id === theme.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }
                  `}
                  aria-pressed={currentTheme.id === theme.id}
                >
                  <div
                    className="w-full h-8 rounded-lg mb-2"
                    style={{ backgroundColor: theme.colors.primary }}
                    aria-hidden="true"
                  />
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {theme.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {theme.isDark ? '深色' : '浅色'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 颜色定制 */}
        {activeTab === 'colors' && (
          <div className="space-y-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              自定义主题的颜色
            </p>
            
            {/* 主要颜色 */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">主要颜色</h3>
              <div className="space-y-3">
                <ColorPicker
                  label="主色调"
                  value={currentTheme.colors.primary}
                  onChange={(color) => customizeColors({ primary: color })}
                />
                <ColorPicker
                  label="主色调（悬停）"
                  value={currentTheme.colors.primaryHover}
                  onChange={(color) => customizeColors({ primaryHover: color })}
                />
                <ColorPicker
                  label="强调色"
                  value={currentTheme.colors.accent}
                  onChange={(color) => customizeColors({ accent: color })}
                />
              </div>
            </div>

            {/* 背景颜色 */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">背景颜色</h3>
              <div className="space-y-3">
                <ColorPicker
                  label="背景色"
                  value={currentTheme.colors.background}
                  onChange={(color) => customizeColors({ background: color })}
                />
                <ColorPicker
                  label="前景色"
                  value={currentTheme.colors.foreground}
                  onChange={(color) => customizeColors({ foreground: color })}
                />
                <ColorPicker
                  label="卡片背景"
                  value={currentTheme.colors.card}
                  onChange={(color) => customizeColors({ card: color })}
                />
                <ColorPicker
                  label="边框色"
                  value={currentTheme.colors.border}
                  onChange={(color) => customizeColors({ border: color })}
                />
              </div>
            </div>

            {/* 状态颜色 */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">状态颜色</h3>
              <div className="space-y-3">
                <ColorPicker
                  label="成功"
                  value={currentTheme.colors.success}
                  onChange={(color) => customizeColors({ success: color })}
                />
                <ColorPicker
                  label="警告"
                  value={currentTheme.colors.warning}
                  onChange={(color) => customizeColors({ warning: color })}
                />
                <ColorPicker
                  label="错误"
                  value={currentTheme.colors.error}
                  onChange={(color) => customizeColors({ error: color })}
                />
                <ColorPicker
                  label="信息"
                  value={currentTheme.colors.info}
                  onChange={(color) => customizeColors({ info: color })}
                />
              </div>
            </div>
          </div>
        )}

        {/* 间距定制 */}
        {activeTab === 'spacing' && (
          <div className="space-y-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              调整元素间距和圆角
            </p>

            {/* 间距 */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">间距</h3>
              <div className="space-y-4">
                <Slider
                  label="组件间距"
                  value={currentTheme.spacing.componentGap}
                  min={8}
                  max={32}
                  unit="px"
                  onChange={(v) => customizeSpacing({ componentGap: v })}
                />
                <Slider
                  label="卡片内边距"
                  value={currentTheme.spacing.cardPadding}
                  min={8}
                  max={32}
                  unit="px"
                  onChange={(v) => customizeSpacing({ cardPadding: v })}
                />
                <Slider
                  label="页面边距"
                  value={currentTheme.spacing.pagePadding}
                  min={12}
                  max={48}
                  unit="px"
                  onChange={(v) => customizeSpacing({ pagePadding: v })}
                />
              </div>
            </div>

            {/* 圆角 */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">圆角</h3>
              <div className="space-y-4">
                <Slider
                  label="按钮圆角"
                  value={currentTheme.radius.button}
                  min={0}
                  max={24}
                  unit="px"
                  onChange={(v) => customizeRadius({ button: v })}
                />
                <Slider
                  label="卡片圆角"
                  value={currentTheme.radius.card}
                  min={0}
                  max={24}
                  unit="px"
                  onChange={(v) => customizeRadius({ card: v })}
                />
                <Slider
                  label="输入框圆角"
                  value={currentTheme.radius.input}
                  min={0}
                  max={16}
                  unit="px"
                  onChange={(v) => customizeRadius({ input: v })}
                />
              </div>
            </div>
          </div>
        )}

        {/* 高级设置 */}
        {activeTab === 'advanced' && (
          <div className="space-y-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              高级主题设置
            </p>

            {/* 字体 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900 dark:text-white">
                字体系列
              </label>
              <select
                value={currentTheme.fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="Inter, system-ui, sans-serif">Inter (默认)</option>
                <option value="system-ui, sans-serif">系统字体</option>
                <option value="'SF Pro Display', system-ui, sans-serif">SF Pro</option>
                <option value="Roboto, system-ui, sans-serif">Roboto</option>
                <option value="'Noto Sans SC', system-ui, sans-serif">思源黑体</option>
                <option value="Arial, sans-serif">Arial</option>
              </select>
            </div>

            {/* 动画速度 */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">动画速度</h3>
              <Slider
                label="动画倍率"
                value={currentTheme.animationSpeed}
                min={0.25}
                max={2}
                step={0.25}
                unit="x"
                onChange={setAnimationSpeed}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                1x 为正常速度，0.5x 为半速，2x 为双倍速度
              </p>
            </div>

            {/* 操作按钮 */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowSaveDialog(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  💾 保存为自定义主题
                </button>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  📤 导出主题
                </button>
                <button
                  onClick={handleImport}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  📥 导入主题
                </button>
                <button
                  onClick={resetTheme}
                  className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  🔄 重置为默认
                </button>
              </div>

              {/* 状态提示 */}
              {exportSuccess && (
                <div className="text-sm text-green-600 dark:text-green-400">
                  ✓ 主题已复制到剪贴板
                </div>
              )}
              {importError && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  ✗ {importError}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 保存对话框 */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              保存自定义主题
            </h3>
            <input
              type="text"
              value={newThemeName}
              onChange={(e) => setNewThemeName(e.target.value)}
              placeholder="输入主题名称"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleSaveCustom}
                disabled={!newThemeName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 预览 */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">预览</div>
        <div
          className="p-4 rounded-xl transition-colors"
          style={{
            backgroundColor: currentTheme.colors.card,
            borderColor: currentTheme.colors.border,
            borderWidth: 1,
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-full"
              style={{ backgroundColor: currentTheme.colors.primary }}
            />
            <div>
              <div
                className="font-medium"
                style={{ color: currentTheme.colors.foreground }}
              >
                示例标题
              </div>
              <div
                className="text-sm opacity-60"
                style={{ color: currentTheme.colors.foreground }}
              >
                示例描述文字
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-lg text-white font-medium transition-colors"
              style={{
                backgroundColor: currentTheme.colors.primary,
                borderRadius: currentTheme.radius.button,
              }}
            >
              主要按钮
            </button>
            <button
              className="px-4 py-2 rounded-lg font-medium transition-colors"
              style={{
                backgroundColor: currentTheme.colors.background,
                color: currentTheme.colors.foreground,
                borderColor: currentTheme.colors.border,
                borderWidth: 1,
                borderRadius: currentTheme.radius.button,
              }}
            >
              次要按钮
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ThemeCustomizer;