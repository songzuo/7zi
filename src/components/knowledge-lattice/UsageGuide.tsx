/**
 * 使用说明组件
 */

'use client';

import React from 'react';

export function UsageGuide() {
  return (
    <div className="bg-slate-800 p-4 rounded-lg">
      <h2 className="text-lg font-bold mb-3">使用说明</h2>
      <ul className="text-sm text-slate-300 space-y-1">
        <li>• 点击节点查看详情</li>
        <li>• 拖拽旋转 3D 视图</li>
        <li>• 滚轮缩放</li>
        <li>• 悬停显示节点标签</li>
        <li>• 切换布局查看不同排列</li>
      </ul>
    </div>
  );
}
