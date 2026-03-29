/**
 * Breakpoints.stories.ts - 响应式断点的 Storybook 故事
 */

import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

const meta: Meta = {
  title: 'Design Tokens/Breakpoints',
};

export default meta;

// 断点数据
const breakpoints = [
  { name: 'sm', min: '640px', description: '小型设备' },
  { name: 'md', min: '768px', description: '中等设备 (平板)' },
  { name: 'lg', min: '1024px', description: '大型设备 (桌面)' },
  { name: 'xl', min: '1280px', description: '超大设备' },
  { name: '2xl', min: '1536px', description: '超宽设备' },
];

// 当前断点检测器
const BreakpointDetector = () => {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [currentBreakpoint, setCurrentBreakpoint] = useState('md');
  
  React.useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setWidth(w);
      
      if (w >= 1536) setCurrentBreakpoint('2xl');
      else if (w >= 1280) setCurrentBreakpoint('xl');
      else if (w >= 1024) setCurrentBreakpoint('lg');
      else if (w >= 768) setCurrentBreakpoint('md');
      else if (w >= 640) setCurrentBreakpoint('sm');
      else setCurrentBreakpoint('xs');
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center">
      <div className="text-3xl font-bold text-blue-600 mb-2">
        {width}px
      </div>
      <div className="text-lg text-blue-800">
        当前断点: <span className="font-bold">{currentBreakpoint}</span>
      </div>
      <p className="text-sm text-blue-600 mt-2">
        调整浏览器窗口大小查看断点变化
      </p>
    </div>
  );
};

// 断点参考
export const BreakpointReference: Story = {
  render: () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">断点系统 (Breakpoints)</h2>
      <p className="text-gray-600">
        响应式设计使用这些断点来适应不同设备尺寸。
      </p>
      
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                断点名称
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                最小宽度
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                典型设备
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                栅格列数
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {breakpoints.map((bp, index) => (
              <tr key={index}>
                <td className="px-6 py-4">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                    {bp.name}
                  </code>
                </td>
                <td className="px-6 py-4">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                    {bp.min}
                  </code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {bp.description}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {index < breakpoints.length - 1 ? `-${bp.name}:${index + 2} +` : `${index + 2}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  ),
};

// 实时检测器
export const LiveDetector: Story = {
  render: () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">实时断点检测</h2>
      <BreakpointDetector />
    </div>
  ),
};

// 响应式网格
export const ResponsiveGrid: Story = {
  render: () => {
    const items = Array.from({ length: 12 }, (_, i) => i + 1);
    
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">响应式网格示例</h2>
        <p className="text-gray-600">
          网格会根据断点自动调整列数：
        </p>
        <ul className="text-sm text-gray-600 mb-4 space-y-1">
          <li>• xs-sm: 1 列</li>
          <li>• md: 2 列</li>
          <li>• lg: 3 列</li>
          <li>• xl: 4 列</li>
        </ul>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item}
              className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg text-center font-bold"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    );
  },
};

// 响应式卡片
export const ResponsiveCards: Story = {
  render: () => {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">响应式卡片布局</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="bg-white border rounded-lg shadow-md overflow-hidden"
            >
              <div className="h-32 bg-gradient-to-r from-purple-400 to-pink-400" />
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  卡片标题 {item}
                </h3>
                <p className="text-sm text-gray-600">
                  这是一个响应式卡片，会根据屏幕尺寸自动调整布局。
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  },
};

// 响应式导航
export const ResponsiveNavigation: Story = {
  render: () => {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">响应式导航</h2>
        
        <nav className="bg-white border rounded-lg shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <span className="text-xl font-bold text-gray-900">
                  Logo
                </span>
              </div>
              
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  <a
                    href="#"
                    className="text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    首页
                  </a>
                  <a
                    href="#"
                    className="text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    关于
                  </a>
                  <a
                    href="#"
                    className="text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    服务
                  </a>
                  <a
                    href="#"
                    className="text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    联系
                  </a>
                </div>
              </div>
              
              <div className="md:hidden">
                <span className="text-gray-600 text-sm">
                  ☰ 菜单 (移动端)
                </span>
              </div>
            </div>
          </div>
        </nav>
      </div>
    );
  },
};

// 响应式表单
export const ResponsiveForm: Story = {
  render: () => {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">响应式表单布局</h2>
        
        <form className="bg-white border rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                姓
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入姓"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                名
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入名"
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              邮箱地址
            </label>
            <input
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="example@email.com"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              留言
            </label>
            <textarea
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入您的留言"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              提交
            </button>
          </div>
        </form>
      </div>
    );
  },
};

// 响应式排版
export const ResponsiveTypography: Story = {
  render: () => {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">响应式排版</h2>
        
        <article className="bg-white border rounded-lg shadow-md p-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            响应式标题
          </h1>
          
          <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-4">
            这个标题会根据屏幕尺寸调整大小。在小屏幕上显示为 text-3xl，
            在大屏幕上显示为 text-4xl。
          </p>
          
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-3 mt-6">
            子标题
          </h2>
          
          <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-4">
            文本内容也会根据屏幕尺寸调整大小，确保在各种设备上都有良好的阅读体验。
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold text-gray-900 mb-2">特性 1</h3>
              <p className="text-sm text-gray-600">
                描述文本
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold text-gray-900 mb-2">特性 2</h3>
              <p className="text-sm text-gray-600">
                描述文本
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold text-gray-900 mb-2">特性 3</h3>
              <p className="text-sm text-gray-600">
                描述文本
              </p>
            </div>
          </div>
        </article>
      </div>
    );
  },
};
