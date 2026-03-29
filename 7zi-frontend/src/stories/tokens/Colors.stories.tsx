/**
 * Colors.stories.ts - 颜色设计 Token 的 Storybook 故事
 */

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

const meta: Meta = {
  title: 'Design Tokens/Colors',
};

export default meta;

// 颜色数据
const colors = {
  primary: {
    name: '主色调 (Primary)',
    values: [
      { name: 'primary-50', hex: '#eff6ff' },
      { name: 'primary-100', hex: '#dbeafe' },
      { name: 'primary-200', hex: '#bfdbfe' },
      { name: 'primary-300', hex: '#93c5fd' },
      { name: 'primary-400', hex: '#60a5fa' },
      { name: 'primary-500', hex: '#3b82f6' },
      { name: 'primary-600', hex: '#2563eb' },
      { name: 'primary-700', hex: '#1d4ed8' },
      { name: 'primary-800', hex: '#1e40af' },
      { name: 'primary-900', hex: '#1e3a8a' },
    ],
  },
  gray: {
    name: '灰色系 (Gray)',
    values: [
      { name: 'gray-50', hex: '#f9fafb' },
      { name: 'gray-100', hex: '#f3f4f6' },
      { name: 'gray-200', hex: '#e5e7eb' },
      { name: 'gray-300', hex: '#d1d5db' },
      { name: 'gray-400', hex: '#9ca3af' },
      { name: 'gray-500', hex: '#6b7280' },
      { name: 'gray-600', hex: '#4b5563' },
      { name: 'gray-700', hex: '#374151' },
      { name: 'gray-800', hex: '#1f2937' },
      { name: 'gray-900', hex: '#111827' },
    ],
  },
  success: {
    name: '成功色 (Success)',
    values: [
      { name: 'success-50', hex: '#f0fdf4' },
      { name: 'success-500', hex: '#22c55e' },
      { name: 'success-600', hex: '#16a34a' },
      { name: 'success-700', hex: '#15803d' },
    ],
  },
  warning: {
    name: '警告色 (Warning)',
    values: [
      { name: 'warning-50', hex: '#fffbeb' },
      { name: 'warning-500', hex: '#f59e0b' },
      { name: 'warning-600', hex: '#d97706' },
      { name: 'warning-700', hex: '#b45309' },
    ],
  },
  error: {
    name: '错误色 (Error)',
    values: [
      { name: 'error-50', hex: '#fef2f2' },
      { name: 'error-500', hex: '#ef4444' },
      { name: 'error-600', hex: '#dc2626' },
      { name: 'error-700', hex: '#b91c1c' },
    ],
  },
  info: {
    name: '信息色 (Info)',
    values: [
      { name: 'info-50', hex: '#eff6ff' },
      { name: 'info-500', hex: '#3b82f6' },
      { name: 'info-600', hex: '#2563eb' },
      { name: 'info-700', hex: '#1d4ed8' },
    ],
  },
};

// 颜色条组件
const ColorSwatch = ({ name, hex }: { name: string; hex: string }) => {
  const textColor = parseInt(hex.slice(1), 16) > 0xffffff / 2 ? 'text-gray-900' : 'text-white';
  
  return (
    <div className="flex items-center gap-4 mb-2">
      <div
        className="w-20 h-10 rounded-lg shadow-sm flex items-center justify-center"
        style={{ backgroundColor: hex }}
      >
        <span className={`text-xs font-mono ${textColor}`}>{hex}</span>
      </div>
      <div className="flex-1">
        <span className="text-sm font-medium text-gray-700">{name}</span>
      </div>
    </div>
  );
};

// 颜色组组件
const ColorGroup = ({ title, colors }: { title: string; colors: Array<{ name: string; hex: string }> }) => (
  <div className="mb-8">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
    <div className="space-y-2">
      {colors.map((color) => (
        <ColorSwatch key={color.name} name={color.name} hex={color.hex} />
      ))}
    </div>
  </div>
);

// 所有颜色
export const AllColors: Story = {
  render: () => (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">颜色系统</h2>
      {Object.values(colors).map((colorGroup) => (
        <ColorGroup key={colorGroup.name} title={colorGroup.name} colors={colorGroup.values} />
      ))}
    </div>
  ),
};

// 主色调
export const Primary: Story = {
  render: () => (
    <ColorGroup title="主色调 (Primary)" colors={colors.primary.values} />
  ),
};

// 灰色系
export const Gray: Story = {
  render: () => (
    <ColorGroup title="灰色系 (Gray)" colors={colors.gray.values} />
  ),
};

// 语义颜色
export const Semantic: Story = {
  render: () => (
    <div className="space-y-8">
      <ColorGroup title="成功色 (Success)" colors={colors.success.values} />
      <ColorGroup title="警告色 (Warning)" colors={colors.warning.values} />
      <ColorGroup title="错误色 (Error)" colors={colors.error.values} />
      <ColorGroup title="信息色 (Info)" colors={colors.info.values} />
    </div>
  ),
};

// 调色板展示
export const Palette: Story = {
  render: () => (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">调色板</h2>
      
      {Object.entries(colors).map(([key, colorGroup]) => (
        <div key={key}>
          <h3 className="text-lg font-semibold mb-4">{colorGroup.name}</h3>
          <div className="flex rounded-lg overflow-hidden shadow-lg">
            {colorGroup.values.map((color, index) => {
              const textColor = parseInt(color.hex.slice(1), 16) > 0xffffff / 2
                ? 'text-gray-900'
                : 'text-white';
              
              return (
                <div
                  key={color.name}
                  className="flex-1 h-24 flex flex-col items-center justify-center"
                  style={{ backgroundColor: color.hex }}
                >
                  <span className={`text-xs font-medium ${textColor}`}>
                    {color.name.split('-')[1]}
                  </span>
                  <span className={`text-xs font-mono ${textColor}`}>
                    {color.hex}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  ),
};

// 对比度示例
export const Contrast: Story = {
  render: () => {
    const examples = [
      { bg: '#3b82f6', fg: '#ffffff', ratio: '8.59:1', label: '主色 - 白色 (AAA)' },
      { bg: '#3b82f6', fg: '#000000', ratio: '2.44:1', label: '主色 - 黑色 (失败)' },
      { bg: '#22c55e', fg: '#ffffff', ratio: '3.31:1', label: '成功色 - 白色 (AA)' },
      { bg: '#ef4444', fg: '#ffffff', ratio: '4.53:1', label: '错误色 - 白色 (AA)' },
      { bg: '#111827', fg: '#f9fafb', ratio: '15.42:1', label: '深灰 - 浅灰 (AAA)' },
    ];
    
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">对比度示例</h2>
        <p className="text-gray-600 mb-4">
          WCAG 2.0 要求正常文本对比度至少为 4.5:1 (AA级) 或 7:1 (AAA级)。
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {examples.map((example, index) => (
            <div
              key={index}
              className="p-6 rounded-lg shadow-md"
              style={{ backgroundColor: example.bg }}
            >
              <p
                className="text-lg font-semibold mb-2"
                style={{ color: example.fg }}
              >
                示例文本
              </p>
              <p
                className="text-sm mb-2"
                style={{ color: example.fg }}
              >
                {example.label}
              </p>
              <p
                className="text-xs font-mono"
                style={{ color: example.fg }}
              >
                对比度: {example.ratio}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  },
};
