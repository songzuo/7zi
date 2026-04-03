import React, { useState } from 'react';
import WorkflowDesigner from './WorkflowDesigner';
import ExecutionMonitor from './ExecutionMonitor';
import TemplateMarket from './TemplateMarket';
import './WorkflowApp.css';

// ============ 类型定义 ============

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  author: string;
  downloads: number;
  rating: number;
  tags: string[];
  workflow: any;
  createdAt: string;
}

// ============ 主应用组件 ============

const WorkflowApp: React.FC = () => {
  const [view, setView] = useState<'market' | 'designer' | 'monitor'>('market');
  const [currentWorkflow, setCurrentWorkflow] = useState<any>(null);
  const [executionId, setExecutionId] = useState<string | null>(null);

  // 从模板选择
  const handleSelectTemplate = (template: Template) => {
    setCurrentWorkflow(template.workflow);
    setView('designer');
  };

  // 创建新工作流
  const handleCreateNew = () => {
    setCurrentWorkflow(null);
    setView('designer');
  };

  // 保存工作流
  const handleSaveWorkflow = async (workflow: any) => {
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflow),
      });
      
      if (response.ok) {
        const result = await response.json();
        setCurrentWorkflow(result.data);
        alert('Workflow saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save workflow:', error);
      alert('Failed to save workflow');
    }
  };

  // 执行工作流
  const handleExecuteWorkflow = async (workflow: any) => {
    try {
      const response = await fetch(`/api/workflows/${workflow.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables: workflow.variables || {} }),
      });
      
      if (response.ok) {
        const result = await response.json();
        setExecutionId(result.data.id);
        setView('monitor');
      }
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      alert('Failed to execute workflow');
    }
  };

  // 返回市场
  const handleBackToMarket = () => {
    setView('market');
    setCurrentWorkflow(null);
    setExecutionId(null);
  };

  // 返回设计器
  const handleBackToDesigner = () => {
    setView('designer');
    setExecutionId(null);
  };

  return (
    <div className="workflow-app">
      {/* 导航栏 */}
      <nav className="app-nav">
        <div className="nav-left">
          <h1 className="app-title">⚡ Workflow Engine v1.10.0</h1>
        </div>
        <div className="nav-right">
          <button
            className={`nav-btn ${view === 'market' ? 'active' : ''}`}
            onClick={handleBackToMarket}
          >
            📚 Templates
          </button>
          {currentWorkflow && (
            <button
              className={`nav-btn ${view === 'designer' ? 'active' : ''}`}
              onClick={handleBackToDesigner}
            >
              🎨 Designer
            </button>
          )}
          {executionId && (
            <button
              className={`nav-btn ${view === 'monitor' ? 'active' : ''}`}
              onClick={() => setView('monitor')}
            >
              📊 Monitor
            </button>
          )}
        </div>
      </nav>

      {/* 主内容区域 */}
      <main className="app-main">
        {view === 'market' && (
          <TemplateMarket
            onSelect={handleSelectTemplate}
            onCreateNew={handleCreateNew}
          />
        )}
        
        {view === 'designer' && (
          <WorkflowDesigner
            initialWorkflow={currentWorkflow}
            onSave={handleSaveWorkflow}
            onExecute={handleExecuteWorkflow}
          />
        )}
        
        {view === 'monitor' && executionId && (
          <ExecutionMonitor
            executionId={executionId}
            onClose={handleBackToDesigner}
          />
        )}
      </main>

      {/* 页脚 */}
      <footer className="app-footer">
        <p>Workflow Automation Engine v1.10.0 | Powered by Minimax</p>
      </footer>
    </div>
  );
};

export default WorkflowApp;