/**
 * Typography.stories.ts - 字体设计 Token 的 Storybook 故事
 */

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

const meta: Meta = {
  title: 'Design Tokens/Typography',
};

export default meta;

// 字体族
export const FontFamilies: Story = {
  render: () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">字体族 (Font Families)</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-2">
            --font-family-sans
          </h3>
          <p className="text-xl" style={{ fontFamily: 'Inter, sans-serif' }}>
            无衬线字体 (Sans-Serif)
            <span className="text-gray-500 text-sm block mt-1">
              Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif
            </span>
          </p>
        </div>
        
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-2">
            --font-family-mono
          </h3>
          <p className="text-xl" style={{ fontFamily: 'monospace' }}>
            等宽字体 (Monospace)
            <span className="text-gray-500 text-sm block mt-1">
              JetBrains Mono, Fira Code, Consolas, monospace
            </span>
          </p>
        </div>
      </div>
    </div>
  ),
};

// 字体大小
export const FontSizes: Story = {
  render: () => {
    const sizes = [
      { name: 'text-xs', token: '--font-size-xs', value: '0.75rem (12px)' },
      { name: 'text-sm', token: '--font-size-sm', value: '0.875rem (14px)' },
      { name: 'text-base', token: '--font-size-base', value: '1rem (16px)' },
      { name: 'text-lg', token: '--font-size-lg', value: '1.125rem (18px)' },
      { name: 'text-xl', token: '--font-size-xl', value: '1.25rem (20px)' },
      { name: 'text-2xl', token: '--font-size-2xl', value: '1.5rem (24px)' },
      { name: 'text-3xl', token: '--font-size-3xl', value: '1.875rem (30px)' },
      { name: 'text-4xl', token: '--font-size-4xl', value: '2.25rem (36px)' },
      { name: 'text-5xl', token: '--font-size-5xl', value: '3rem (48px)' },
    ];
    
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">字体大小 (Font Sizes)</h2>
        
        <div className="space-y-4">
          {sizes.map((size) => (
            <div key={size.name} className="flex items-center gap-4">
              <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                {size.token}
              </code>
              <div className="flex-1 border-b pb-2">
                <p className={`mb-1 ${size.name}`}>
                  这是一段示例文本，字号为 {size.value}
                </p>
                <span className="text-xs text-gray-500">{size.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  },
};

// 字重
export const FontWeights: Story = {
  render: () => {
    const weights = [
      { name: 'font-normal', value: '400', token: '--font-weight-normal' },
      { name: 'font-medium', value: '500', token: '--font-weight-medium' },
      { name: 'font-semibold', value: '600', token: '--font-weight-semibold' },
      { name: 'font-bold', value: '700', token: '--font-weight-bold' },
    ];
    
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">字重 (Font Weights)</h2>
        
        <div className="space-y-4">
          {weights.map((weight) => (
            <div key={weight.name} className="flex items-center gap-4">
              <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                {weight.token}
              </code>
              <div className="flex-1 border-b pb-2">
                <p className={`text-xl ${weight.name}`}>
                  字重 {weight.value} - 这是一段示例文本
                </p>
                <span className="text-xs text-gray-500">{weight.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  },
};

// 行高
export const LineHeights: Story = {
  render: () => {
    const heights = [
      { name: 'leading-tight', value: '1.25', token: '--line-height-tight' },
      { name: 'leading-normal', value: '1.5', token: '--line-height-normal' },
      { name: 'leading-relaxed', value: '1.75', token: '--line-height-relaxed' },
    ];
    
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">行高 (Line Heights)</h2>
        
        <div className="space-y-6">
          {heights.map((height) => (
            <div key={height.name}>
              <div className="flex items-center gap-4 mb-2">
                <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                  {height.token}
                </code>
                <span className="text-xs text-gray-500">{height.value}</span>
              </div>
              <p className={`text-base ${height.name}`}>
                这是一段用于展示行高的示例文本。不同的行高值会影响文本的可读性和视觉感受。适当的行高可以让文本更容易阅读，提升整体的用户体验。
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  },
};

// 标题层级
export const Headings: Story = {
  render: () => {
    const headings = [
      { level: 1, text: '一级标题 Heading 1', classes: 'text-5xl font-bold' },
      { level: 2, text: '二级标题 Heading 2', classes: 'text-4xl font-bold' },
      { level: 3, text: '三级标题 Heading 3', classes: 'text-3xl font-bold' },
      { level: 4, text: '四级标题 Heading 4', classes: 'text-2xl font-semibold' },
      { level: 5, text: '五级标题 Heading 5', classes: 'text-xl font-semibold' },
      { level: 6, text: '六级标题 Heading 6', classes: 'text-lg font-semibold' },
    ];
    
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">标题层级 (Heading Hierarchy)</h2>
        
        <div className="space-y-6">
          {headings.map((heading) => (
            <div key={heading.level}>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono mb-2 block">
                h{heading.level}
              </code>
              <h1 className={heading.classes}>{heading.text}</h1>
            </div>
          ))}
        </div>
      </div>
    );
  },
};

// 排版示例
export const TypographyExample: Story = {
  render: () => (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-4xl font-bold text-gray-900 mb-4">
        排版系统示例
      </h2>
      
      <p className="text-lg text-gray-700 leading-relaxed">
        这是一段正文示例。良好的排版系统对于创建美观且易于阅读的界面至关重要。
        它包括字体族、字号、字重、行高等要素的组合。
      </p>
      
      <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
        字体家族的选择
      </h3>
      
      <p className="text-base text-gray-700 leading-relaxed">
        我们选择 Inter 作为主要字体，因为它在各种设备上都有出色的可读性，
        并且提供了良好的视觉平衡。对于代码和等宽文本，我们使用 JetBrains Mono 或 Fira Code。
      </p>
      
      <h4 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
        层级结构
      </h4>
      
      <ul className="list-disc list-inside text-base text-gray-700 space-y-2">
        <li>清晰的标题层级</li>
        <li>一致的间距系统</li>
        <li>适当的对比度</li>
        <li>良好的可读性</li>
      </ul>
      
      <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-6">
        <p className="text-lg italic text-gray-600">
          "设计不仅仅是外观，更是它的运作方式。" — 史蒂夫·乔布斯
        </p>
      </blockquote>
      
      <code className="block bg-gray-100 p-4 rounded-lg text-sm font-mono">
        const designSystem = &#123;<br/>
        &nbsp;&nbsp;colors: ['#3b82f6', '#22c55e', '#ef4444'],<br/>
        &nbsp;&nbsp;fonts: ['Inter', 'JetBrains Mono'],<br/>
        &nbsp;&nbsp;spacings: [4, 8, 12, 16, 20, 24]<br/>
        &#125;;
      </code>
    </div>
  ),
};

// 文本颜色
export const TextColors: Story = {
  render: () => {
    const textColors = [
      { name: '主文本', classes: 'text-gray-900', hex: '#111827' },
      { name: '次要文本', classes: 'text-gray-700', hex: '#374151' },
      { name: '辅助文本', classes: 'text-gray-500', hex: '#6b7280' },
      { name: '禁用文本', classes: 'text-gray-400', hex: '#9ca3af' },
      { name: '链接文本', classes: 'text-blue-600', hex: '#2563eb' },
      { name: '成功文本', classes: 'text-green-600', hex: '#16a34a' },
      { name: '警告文本', classes: 'text-yellow-600', hex: '#d97706' },
      { name: '错误文本', classes: 'text-red-600', hex: '#dc2626' },
    ];
    
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">文本颜色 (Text Colors)</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {textColors.map((color) => (
            <div key={color.name} className="flex items-center gap-4 p-4 border rounded-lg">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: color.hex }}
              >
                <span className="text-xs text-white font-mono">{color.hex}</span>
              </div>
              <div>
                <p className={`text-lg ${color.classes}`}>{color.name}</p>
                <span className="text-xs text-gray-500">{color.hex}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  },
};
