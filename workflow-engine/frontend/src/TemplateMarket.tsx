import React, { useState, useEffect } from 'react';
import { Workflow } from './App';
import './TemplateMarket.css';

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
  workflow: Workflow;
  createdAt: string;
}

export type { Template };

interface TemplateMarketProps {
  onSelect: (template: Template) => void;
  onCreateNew: () => void;
}

// ============ 模板市场组件 ============

const TemplateMarket: React.FC<TemplateMarketProps> = ({ onSelect, onCreateNew }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'rating'>('popular');

  // 加载模板
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      setTemplates(data.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      // 使用示例模板
      setTemplates(getExampleTemplates());
      setLoading(false);
    }
  };

  // 示例模板
  const getExampleTemplates = (): Template[] => {
    const baseWorkflow = { nodes: [] as Workflow['nodes'], edges: [] as Workflow['edges'] };
    
    return [
      {
        id: 'tpl_1',
        name: 'API Integration Flow',
        description: 'Generic API integration workflow with retry logic and error handling',
        category: 'integration',
        author: 'Workflow Team',
        downloads: 1523,
        rating: 4.8,
        tags: ['api', 'http', 'integration'],
        workflow: { ...baseWorkflow, name: 'API Integration Flow' },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'tpl_2',
        name: 'Data Processing Pipeline',
        description: 'ETL pipeline for data transformation and validation',
        category: 'data',
        author: 'Data Team',
        downloads: 2341,
        rating: 4.6,
        tags: ['data', 'etl', 'transform'],
        workflow: { ...baseWorkflow, name: 'Data Processing Pipeline' },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'tpl_3',
        name: 'AI Content Generator',
        description: 'AI-powered content generation using Minimax',
        category: 'ai',
        author: 'AI Team',
        downloads: 3456,
        rating: 4.9,
        tags: ['ai', 'minimax', 'content'],
        workflow: { ...baseWorkflow, name: 'AI Content Generator' },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'tpl_4',
        name: 'Notification Dispatcher',
        description: 'Multi-channel notification system with templates',
        category: 'notification',
        author: 'Communication Team',
        downloads: 892,
        rating: 4.5,
        tags: ['notification', 'email', 'slack'],
        workflow: { ...baseWorkflow, name: 'Notification Dispatcher' },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'tpl_5',
        name: 'Scheduled Report Generator',
        description: 'Automated report generation and distribution',
        category: 'automation',
        author: 'Analytics Team',
        downloads: 1567,
        rating: 4.7,
        tags: ['report', 'schedule', 'automation'],
        workflow: { ...baseWorkflow, name: 'Scheduled Report Generator' },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'tpl_6',
        name: 'Webhook Handler',
        description: 'Generic webhook processing workflow',
        category: 'integration',
        author: 'Integration Team',
        downloads: 2134,
        rating: 4.4,
        tags: ['webhook', 'http', 'api'],
        workflow: { ...baseWorkflow, name: 'Webhook Handler' },
        createdAt: new Date().toISOString(),
      },
    ];
  };

  // 过滤和排序
  const filteredTemplates = templates
    .filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.downloads - a.downloads;
        case 'recent':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'rating':
          return b.rating - a.rating;
        default:
          return 0;
      }
    });

  // 导入模板
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        const text = await file.text();
        try {
          const template = JSON.parse(text);
          // 上传模板
          await fetch('/api/templates/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(template),
          });
          fetchTemplates();
        } catch (error) {
          console.error('Failed to import template:', error);
        }
      }
    };
    input.click();
  };

  // 导出模板
  const handleExport = async (template: Template) => {
    const response = await fetch(`/api/templates/${template.id}/export`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 分类
  const categories = [
    { id: 'all', name: 'All Templates', icon: '📁' },
    { id: 'integration', name: 'Integration', icon: '🔗' },
    { id: 'data', name: 'Data Processing', icon: '📊' },
    { id: 'ai', name: 'AI & ML', icon: '🤖' },
    { id: 'notification', name: 'Notifications', icon: '🔔' },
    { id: 'automation', name: 'Automation', icon: '⚡' },
  ];

  return (
    <div className="template-market">
      {/* 头部 */}
      <div className="market-header">
        <div className="header-top">
          <h1>Workflow Templates</h1>
          <div className="header-actions">
            <button className="btn btn-primary" onClick={onCreateNew}>
              ✨ Create New
            </button>
            <button className="btn btn-secondary" onClick={handleImport}>
              📥 Import
            </button>
          </div>
        </div>
        
        {/* 搜索和筛选 */}
        <div className="market-controls">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="sort-controls">
            <label>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
              <option value="popular">Most Popular</option>
              <option value="recent">Most Recent</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>
      </div>

      <div className="market-content">
        {/* 分类侧边栏 */}
        <div className="category-sidebar">
          <h3>Categories</h3>
          <div className="category-list">
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`category-item ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <span className="category-icon">{cat.icon}</span>
                <span className="category-name">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 模板网格 */}
        <div className="template-grid">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading templates...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📭</span>
              <p>No templates found</p>
              <button className="btn btn-primary" onClick={onCreateNew}>
                Create Your First Workflow
              </button>
            </div>
          ) : (
            filteredTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={() => onSelect(template)}
                onExport={() => handleExport(template)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ============ 模板卡片组件 ============

interface TemplateCardProps {
  template: Template;
  onSelect: () => void;
  onExport: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect, onExport }) => {
  return (
    <div className="template-card">
      <div className="card-header">
        <h3>{template.name}</h3>
        <div className="card-rating">
          <span className="stars">{'⭐'.repeat(Math.round(template.rating))}</span>
          <span className="rating-value">{template.rating.toFixed(1)}</span>
        </div>
      </div>
      
      <p className="card-description">{template.description}</p>
      
      <div className="card-tags">
        {template.tags.slice(0, 3).map(tag => (
          <span key={tag} className="tag">#{tag}</span>
        ))}
      </div>
      
      <div className="card-meta">
        <div className="meta-item">
          <span className="meta-icon">👤</span>
          <span>{template.author}</span>
        </div>
        <div className="meta-item">
          <span className="meta-icon">📥</span>
          <span>{formatNumber(template.downloads)} downloads</span>
        </div>
      </div>
      
      <div className="card-actions">
        <button className="btn btn-primary" onClick={onSelect}>
          Use Template
        </button>
        <button className="btn btn-secondary btn-icon" onClick={onExport} title="Export">
          📤
        </button>
      </div>
    </div>
  );
};

// ============ 辅助函数 ============

function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}

export default TemplateMarket;