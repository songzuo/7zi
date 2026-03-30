/**
 * Spacing.stories.ts - 间距设计 Token 的 Storybook 故事
 */

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

const meta: Meta = {
  title: 'Design Tokens/Spacing',
};

export default meta;

// 间距数据
const spacings = [
  { name: 'spacing-0', value: '0', token: '0' },
  { name: 'spacing-1', value: '0.25rem', token: '4px' },
  { name: 'spacing-2', value: '0.5rem', token: '8px' },
  { name: 'spacing-3', value: '0.75rem', token: '12px' },
  { name: 'spacing-4', value: '1rem', token: '16px' },
  { name: 'spacing-5', value: '1.25rem', token: '20px' },
  { name: 'spacing-6', value: '1.5rem', token: '24px' },
  { name: 'spacing-8', value: '2rem', token: '32px' },
  { name: 'spacing-10', value: '2.5rem', token: '40px' },
  { name: 'spacing-12', value: '3rem', token: '48px' },
  { name: 'spacing-16', value: '4rem', token: '64px' },
  { name: 'spacing-20', value: '5rem', token: '80px' },
  { name: 'spacing-24', value: '6rem', token: '96px' },
];

// 间距标尺
const SpacingRuler = () => (
  <div className="space-y-4">
    {spacings.map((spacing) => (
      <div key={spacing.name} className="flex items-center gap-4">
        <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono min-w-[100px]">
          {spacing.name}
        </code>
        <span className="text-xs text-gray-500 min-w-[50px]">{spacing.token}</span>
        <div className="flex-1 flex items-center gap-2">
          <div
            className="bg-blue-500 rounded"
            style={{ width: spacing.value }}
          />
          <div className="h-0.5 flex-1 bg-gray-200" />
        </div>
      </div>
    ))}
  </div>
);

// 所有间距
export const AllSpacing: StoryObj = {
  render: () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">间距系统 (Spacing Scale)</h2>
      <p className="text-gray-600">
        间距系统遵循 4px 基础网格，确保整个设计的一致性。
      </p>
      <SpacingRuler />
    </div>
  ),
};

// 间距示例
export const SpacingExamples: StoryObj = {
  render: () => {
    const examples = [
      { label: '小间距 (spacing-2, spacing-3)', spacing: 'p-3 space-y-2' },
      { label: '中间距 (spacing-4, spacing-6)', spacing: 'p-6 space-y-4' },
      { label: '大间距 (spacing-8, spacing-12)', spacing: 'p-8 space-y-6' },
    ];
    
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">间距应用示例</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {examples.map((example, index) => (
            <div key={index} className="border rounded-lg">
              <div className={`bg-blue-50 ${example.spacing}`}>
                <h4 className="font-semibold text-gray-900">{example.label}</h4>
                <div className="bg-white p-3 rounded border">
                  内容区域
                </div>
                <div className="bg-white p-3 rounded border">
                  另一个内容区域
                </div>
              </div>
              <div className="p-3 bg-gray-50 border-t">
                <code className="text-xs font-mono">{example.spacing}</code>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  },
};

// 卡片间距
export const CardSpacing: StoryObj = {
  render: () => {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">卡片间距示例</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 紧凑卡片 */}
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">紧凑型</h4>
            <div className="bg-gray-50 p-3 rounded border mb-3">
              <p className="text-sm text-gray-600 mb-1">标题</p>
              <p className="text-xs text-gray-500">描述文本</p>
            </div>
            <div className="bg-gray-50 p-3 rounded border">
              <p className="text-sm text-gray-600 mb-1">标题</p>
              <p className="text-xs text-gray-500">描述文本</p>
            </div>
          </div>
          
          {/* 标准卡片 */}
          <div className="border rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-4">标准型</h4>
            <div className="bg-gray-50 p-4 rounded border mb-4">
              <p className="text-base text-gray-600 mb-1">标题</p>
              <p className="text-sm text-gray-500">描述文本</p>
            </div>
            <div className="bg-gray-50 p-4 rounded border">
              <p className="text-base text-gray-600 mb-1">标题</p>
              <p className="text-sm text-gray-500">描述文本</p>
            </div>
          </div>
        </div>
      </div>
    );
  },
};

// 间距对照表
export const SpacingReference: StoryObj = {
  render: () => {
    const reference = [
      { size: '0.25rem (4px)', usage: '图标与文字之间' },
      { size: '0.5rem (8px)', usage: '相关元素之间' },
      { size: '0.75rem (12px)', usage: '小组件内间距' },
      { size: '1rem (16px)', usage: '标准内边距' },
      { size: '1.25rem (20px)', usage: '卡片内边距' },
      { size: '1.5rem (24px)', usage: '段落间距' },
      { size: '2rem (32px)', usage: '区域间距' },
      { size: '2.5rem (40px)', usage: '组件组间距' },
      { size: '3rem (48px)', usage: '主要区域间距' },
      { size: '4rem (64px)', usage: '页面层级间距' },
    ];
    
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">间距使用参考</h2>
        
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  间距大小
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  使用场景
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  视觉示例
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reference.map((item, index) => {
                const sizeValue = parseFloat(item.size);
                const pixelValue = parseInt(item.size.match(/\d+px/)![0]);
                
                return (
                  <tr key={index}>
                    <td className="px-6 py-4">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {item.size}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.usage}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="bg-blue-500 rounded"
                          style={{ width: `${pixelValue}px`, height: '16px' }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  },
};

// 负间距
export const NegativeSpacing: StoryObj = {
  render: () => {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">负间距示例</h2>
        <p className="text-gray-600">
          负间距可以用于创建重叠效果或减少元素之间的间距。
        </p>
        
        <div className="space-y-6">
          {/* 重叠卡片 */}
          <div className="p-6 border rounded-lg">
            <h4 className="font-semibold mb-4">重叠卡片效果</h4>
            <div className="relative">
              <div className="bg-white p-4 rounded-lg border shadow-md z-10 relative">
                第一个卡片
              </div>
              <div className="bg-white p-4 rounded-lg border shadow-md mt-[-12px] ml-8">
                第二个卡片 (负间距 -12px)
              </div>
            </div>
          </div>
          
          {/* 图标和文字 */}
          <div className="p-6 border rounded-lg">
            <h4 className="font-semibold mb-4">图标和文字对齐</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white">
                  ✓
                </div>
                <span>正常间距 (12px)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white">
                  ✓
                </div>
                <span>紧凑间距 (8px)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
};
