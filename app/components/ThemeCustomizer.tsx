'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';
import { useThemeCustomization, PRESET_THEMES, ThemeColors } from '../hooks/useThemeCustomization';

// ============================================================================
// 类型定义
// ============================================================================

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

type TabId = 'presets' | 'colors' | 'spacing' | 'advanced';

interface TabItem {
  id: TabId;
  label: string;
  icon: string;
}

// ============================================================================
// 常量配置 - 移到模块级别避免每次渲染重新创建
// ============================================================================

const TABS: TabItem[] = [
  { id: 'presets', label: '预设主题', icon: '🎨' },
  { id: 'colors', label: '颜色', icon: '🌈' },
  { id: 'spacing', label: '间距', icon: '📐' },
  { id: 'advanced', label: '高级', icon: '⚙️' },
];

const FONT_OPTIONS = [
  { value: 'Inter, system-ui, sans-serif', label: 'Inter (默认)' },
  { value: 'system-ui, sans-serif', label: '系统字体' },
  { value: "'SF Pro Display', system-ui, sans-serif", label: 'SF Pro' },
  { value: 'Roboto, system-ui, sans-serif', label: 'Roboto' },
  { value: "'Noto Sans SC', system-ui, sans-serif", label: '思源黑体' },
  { value: 'Arial, sans-serif', label: 'Arial' },
];

// ============================================================================
// 颜色选择器组件 - 使用 memo 优化
// ============================================================================

const ColorPicker = memo(function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={handleColorChange}
          className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
          aria-label={`选择${label}颜色`}
        />
        <input
          type="text"
          value={value}
          onChange={handleTextChange}
          className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          aria-label={`${label}颜色值`}
        />
      </div>
    </div>
  );
});

// ============================================================================
// 滑块组件 - 使用 memo 优化
// ============================================================================

const Slider = memo(function Slider({ 
  label, 
  value, 
  min, 
  max, 
  step = 1, 
  unit = '', 
  onChange 
}: SliderProps) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  }, [onChange]);

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
          onChange={handleChange}
          className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
          aria-label={label}
        />
        <span className="w-16 text-sm text-gray-600 dark:text-gray-400 text-right">
          {value}{unit}
        </span>
      </div>
    </div>
  );
});

// ============================================================================
// 预设主题卡片组件 - 使用 memo 优化
// ============================================================================

interface PresetThemeCardProps {
  theme: typeof PRESET_THEMES[keyof typeof PRESET_THEMES];
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const PresetThemeCard = memo(function PresetThemeCard({ 
  theme, 
  isSelected, 
  onSelect 
}: PresetThemeCardProps) {
  const handleClick = useCallback(() => {
    onSelect(theme.id);
  }, [theme.id, onSelect]);

  return (
    <button
      onClick={handleClick}
      className={`
        p-4 rounded-xl border-2 text-left transition-all
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
        }
      `}
      aria-pressed={isSelected}
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
  );
});

// ============================================================================
// 标签按钮组件 - 使用 memo 优化
// ============================================================================

interface TabButtonProps {
  tab: TabItem;
  isActive: boolean;
  onClick: (id: TabId) => void;
}

const TabButton = memo(function TabButton({ tab, isActive, onClick }: TabButtonProps) {
  const handleClick = useCallback(() => {
    onClick(tab.id);
  }, [tab.id, onClick]);

  return (
    <button
      onClick={handleClick}
      className={`
        px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors
        focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500
        ${isActive
          ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }
      `}
      aria-selected={isActive}
      role="tab"
    >
      <span className="mr-1.5">{tab.icon}</span>
      {tab.label}
    </button>
  );
});

// ============================================================================
// 保存对话框组件 - 使用 memo 优化
// ============================================================================

interface SaveDialogProps {
  isOpen: boolean;
  themeName: string;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const SaveDialog = memo(function SaveDialog({
  isOpen,
  themeName,
  onNameChange,
  onSave,
  onCancel,
}: SaveDialogProps) {
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onNameChange(e.target.value);
  }, [onNameChange]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onSave();
  }, [onSave]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <form 
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          保存自定义主题
        </h3>
        <input
          type="text"
          value={themeName}
          onChange={handleNameChange}
          placeholder="输入主题名称"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={!themeName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            保存
          </button>
        </div>
      </form>
    </div>
  );
});

// ============================================================================
// 主题预览组件 - 使用 memo 优化
// ============================================================================

interface ThemePreviewProps {
  theme: ReturnType<typeof useThemeCustomization>['currentTheme'];
}

const ThemePreview = memo(function ThemePreview({ theme }: ThemePreviewProps) {
  const previewStyle = useMemo(() => ({
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
  }), [theme.colors.card, theme.colors.border]);

  const primaryButtonStyle = useMemo(() => ({
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.button,
  }), [theme.colors.primary, theme.radius.button]);

  const secondaryButtonStyle = useMemo(() => ({
    backgroundColor: theme.colors.background,
    color: theme.colors.foreground,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.button,
  }), [theme.colors.background, theme.colors.foreground, theme.colors.border, theme.radius.button]);

  return (
    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">预览</div>
      <div
        className="p-4 rounded-xl transition-colors"
        style={previewStyle}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full"
            style={{ backgroundColor: theme.colors.primary }}
          />
          <div>
            <div
              className="font-medium"
              style={{ color: theme.colors.foreground }}
            >
              示例标题
            </div>
            <div
              className="text-sm opacity-60"
              style={{ color: theme.colors.foreground }}
            >
              示例描述文字
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded-lg text-white font-medium transition-colors"
            style={primaryButtonStyle}
          >
            主要按钮
          </button>
          <button
            className="px-4 py-2 rounded-lg font-medium transition-colors"
            style={secondaryButtonStyle}
          >
            次要按钮
          </button>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// 主组件
// ============================================================================

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

  const [activeTab, setActiveTab] = useState<TabId>('presets');
  const [newThemeName, setNewThemeName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  // ============================================================================
  // 使用 useCallback 缓存所有事件处理函数
  // ============================================================================

  const handleTabClick = useCallback((id: TabId) => {
    setActiveTab(id);
  }, []);

  const handleThemeSelect = useCallback((id: string) => {
    setTheme(id);
  }, [setTheme]);

  const handleExport = useCallback(() => {
    const json = exportTheme();
    navigator.clipboard.writeText(json).then(() => {
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2000);
    });
  }, [exportTheme]);

  const handleImport = useCallback(() => {
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
  }, [importTheme]);

  const handleSaveCustom = useCallback(() => {
    if (!newThemeName.trim()) return;
    saveAsCustomTheme(newThemeName.trim());
    setNewThemeName('');
    setShowSaveDialog(false);
  }, [newThemeName, saveAsCustomTheme]);

  const handleCancelSave = useCallback(() => {
    setShowSaveDialog(false);
    setNewThemeName('');
  }, []);

  const handleFontChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFontFamily(e.target.value);
  }, [setFontFamily]);

  const handleAnimationSpeedChange = useCallback((value: number) => {
    setAnimationSpeed(value);
  }, [setAnimationSpeed]);

  // ============================================================================
  // 使用 useMemo 缓存颜色变更回调
  // ============================================================================

  const colorChangeCallbacks = useMemo(() => ({
    primary: (color: string) => customizeColors({ primary: color }),
    primaryHover: (color: string) => customizeColors({ primaryHover: color }),
    accent: (color: string) => customizeColors({ accent: color }),
    background: (color: string) => customizeColors({ background: color }),
    foreground: (color: string) => customizeColors({ foreground: color }),
    card: (color: string) => customizeColors({ card: color }),
    border: (color: string) => customizeColors({ border: color }),
    success: (color: string) => customizeColors({ success: color }),
    warning: (color: string) => customizeColors({ warning: color }),
    error: (color: string) => customizeColors({ error: color }),
    info: (color: string) => customizeColors({ info: color }),
  }), [customizeColors]);

  const spacingChangeCallbacks = useMemo(() => ({
    componentGap: (v: number) => customizeSpacing({ componentGap: v }),
    cardPadding: (v: number) => customizeSpacing({ cardPadding: v }),
    pagePadding: (v: number) => customizeSpacing({ pagePadding: v }),
  }), [customizeSpacing]);

  const radiusChangeCallbacks = useMemo(() => ({
    button: (v: number) => customizeRadius({ button: v }),
    card: (v: number) => customizeRadius({ card: v }),
    input: (v: number) => customizeRadius({ input: v }),
  }), [customizeRadius]);

  // ============================================================================
  // 渲染
  // ============================================================================

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
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onClick={handleTabClick}
            />
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
                <PresetThemeCard
                  key={theme.id}
                  theme={theme}
                  isSelected={currentTheme.id === theme.id}
                  onSelect={handleThemeSelect}
                />
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
                  onChange={colorChangeCallbacks.primary}
                />
                <ColorPicker
                  label="主色调（悬停）"
                  value={currentTheme.colors.primaryHover}
                  onChange={colorChangeCallbacks.primaryHover}
                />
                <ColorPicker
                  label="强调色"
                  value={currentTheme.colors.accent}
                  onChange={colorChangeCallbacks.accent}
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
                  onChange={colorChangeCallbacks.background}
                />
                <ColorPicker
                  label="前景色"
                  value={currentTheme.colors.foreground}
                  onChange={colorChangeCallbacks.foreground}
                />
                <ColorPicker
                  label="卡片背景"
                  value={currentTheme.colors.card}
                  onChange={colorChangeCallbacks.card}
                />
                <ColorPicker
                  label="边框色"
                  value={currentTheme.colors.border}
                  onChange={colorChangeCallbacks.border}
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
                  onChange={colorChangeCallbacks.success}
                />
                <ColorPicker
                  label="警告"
                  value={currentTheme.colors.warning}
                  onChange={colorChangeCallbacks.warning}
                />
                <ColorPicker
                  label="错误"
                  value={currentTheme.colors.error}
                  onChange={colorChangeCallbacks.error}
                />
                <ColorPicker
                  label="信息"
                  value={currentTheme.colors.info}
                  onChange={colorChangeCallbacks.info}
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
                  onChange={spacingChangeCallbacks.componentGap}
                />
                <Slider
                  label="卡片内边距"
                  value={currentTheme.spacing.cardPadding}
                  min={8}
                  max={32}
                  unit="px"
                  onChange={spacingChangeCallbacks.cardPadding}
                />
                <Slider
                  label="页面边距"
                  value={currentTheme.spacing.pagePadding}
                  min={12}
                  max={48}
                  unit="px"
                  onChange={spacingChangeCallbacks.pagePadding}
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
                  onChange={radiusChangeCallbacks.button}
                />
                <Slider
                  label="卡片圆角"
                  value={currentTheme.radius.card}
                  min={0}
                  max={24}
                  unit="px"
                  onChange={radiusChangeCallbacks.card}
                />
                <Slider
                  label="输入框圆角"
                  value={currentTheme.radius.input}
                  min={0}
                  max={16}
                  unit="px"
                  onChange={radiusChangeCallbacks.input}
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
                onChange={handleFontChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {FONT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
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
                onChange={handleAnimationSpeedChange}
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
      <SaveDialog
        isOpen={showSaveDialog}
        themeName={newThemeName}
        onNameChange={setNewThemeName}
        onSave={handleSaveCustom}
        onCancel={handleCancelSave}
      />

      {/* 预览 */}
      <ThemePreview theme={currentTheme} />
    </div>
  );
}

export default ThemeCustomizer;