/**
 * PropertiesPanel - 属性编辑面板
 *
 * 节点和工作流属性编辑器
 */

import React from 'react';
import { NodeProperties } from './NodeProperties';
import type { WorkflowNodeData } from '../types';

interface PropertiesPanelProps {
  node?: any;
  onChange?: (data: Partial<WorkflowNodeData>) => void;
}

export function PropertiesPanel({ node, onChange }: PropertiesPanelProps) {
  if (!node) {
    return (
      <div className="h-full p-4 text-center text-gray-500 dark:text-gray-400">
        <p>选择一个节点以编辑属性</p>
      </div>
    );
  }

  return <NodeProperties node={node} onChange={onChange} />;
}

export { NodeProperties } from './NodeProperties';
