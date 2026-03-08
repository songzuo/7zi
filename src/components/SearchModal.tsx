'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import Fuse from 'fuse.js';
import { projects } from '@/lib/data/projects';

// ============================================================================
// Types
// ============================================================================

export interface SearchableItem {
  id: string;
  type: 'blog' | 'project' | 'team';
  title: string;
  description: string;
  href: string;
  category?: string;
  keywords?: string[];
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale?: string;
}

// ============================================================================
// Search Data
// ============================================================================

const teamMembers: SearchableItem[] = [
  {
    id: 'team-1',
    type: 'team',
    title: 'AI World Expert',
    description: 'Strategy & Future Planning - AI Agent development trends and future layout',
    href: '/team',
    category: 'strategy',
    keywords: ['strategy', 'planning', 'ai', 'expert', '战略', '规划'],
  },
  {
    id: 'team-2',
    type: 'team',
    title: 'Consultant',
    description: 'Research & Analysis - Market dynamics and technology trends',
    href: '/team',
    category: 'strategy',
    keywords: ['research', 'analysis', 'consultant', '咨询', '研究'],
  },
  {
    id: 'team-3',
    type: 'team',
    title: 'Architect',
    description: 'Design & Planning - System architecture and technical solutions',
    href: '/team',
    category: 'tech',
    keywords: ['architecture', 'design', 'system', '架构', '设计'],
  },
  {
    id: 'team-4',
    type: 'team',
    title: 'Executor',
    description: 'Execution & Implementation - High-quality code implementations',
    href: '/team',
    category: 'tech',
    keywords: ['execution', 'code', 'implementation', '执行', '开发'],
  },
  {
    id: 'team-5',
    type: 'team',
    title: 'System Admin',
    description: 'Operations & Deployment - System operations and server management',
    href: '/team',
    category: 'tech',
    keywords: ['admin', 'devops', 'deployment', '运维', '部署'],
  },
  {
    id: 'team-6',
    type: 'team',
    title: 'Tester',
    description: 'Testing & Debugging - Functional testing and quality assurance',
    href: '/team',
    category: 'tech',
    keywords: ['testing', 'qa', 'quality', '测试', '质量'],
  },
  {
    id: 'team-7',
    type: 'team',
    title: 'Designer',
    description: 'UI & Frontend Design - Beautiful and user-friendly interfaces',
    href: '/team',
    category: 'creative',
    keywords: ['designer', 'ui', 'ux', 'frontend', '设计', '界面'],
  },
  {
    id: 'team-8',
    type: 'team',
    title: 'Marketing Specialist',
    description: 'Promotion & SEO - Search engine optimization and brand awareness',
    href: '/team',
    category: 'creative',
    keywords: ['marketing', 'seo', 'promotion', '推广', '营销'],
  },
  {
    id: 'team-9',
    type: 'team',
    title: 'Sales & Support',
    description: 'Sales & Customer Service - Customer communication and solutions',
    href: '/team',
    category: 'business',
    keywords: ['sales', 'support', 'customer', '销售', '客服'],
  },
  {
    id: 'team-10',
    type: 'team',
    title: 'Finance',
    description: 'Accounting & Auditing - Financial management and cost control',
    href: '/team',
    category: 'business',
    keywords: ['finance', 'accounting', 'audit', '财务', '会计'],
  },
  {
    id: 'team-11',
    type: 'team',
    title: 'Media',
    description: 'Media & Publicity - Content planning and brand communication',
    href: '/team',
    category: 'creative',
    keywords: ['media', 'content', 'publicity', '媒体', '宣传'],
  },
];

const blogPosts: SearchableItem[] = [
  {
    id: 'blog-1',
    type: 'blog',
    title: 'AI-Powered Development Workflow',
    description: 'How 11 AI agents work together to deliver high-quality digital projects',
    href: '/blog',
    category: 'technology',
    keywords: ['ai', 'workflow', 'development', 'ai开发', '工作流'],
  },
  {
    id: 'blog-2',
    type: 'blog',
    title: 'Modern Web Development Best Practices',
    description: 'React, TypeScript, and Next.js tips for building scalable applications',
    href: '/blog',
    category: 'technology',
    keywords: ['web', 'react', 'nextjs', '前端', '开发'],
  },
  {
    id: 'blog-3',
    type: 'blog',
    title: 'SEO Optimization Strategies',
    description: 'Advanced techniques for improving search engine rankings',
    href: '/blog',
    category: 'marketing',
    keywords: ['seo', 'optimization', 'search', '优化', '搜索引擎'],
  },
];

// ============================================================================
// Main Component
// ============================================================================

export function SearchModal({ isOpen, onClose, locale = 'en' }: SearchModalProps) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isDark = resolvedTheme === 'dark';

  // Build searchable data
  const searchableItems = useMemo<SearchableItem[]>(() => {
    const projectItems: SearchableItem[] = projects.map((p) => ({
      id: `project-${p.id}`,
      type: 'project' as const,
      title: p.title,
      description: p.description,
      href: `/portfolio/${p.slug}`,
      category: p.category,
      keywords: [...p.techStack, p.client].filter(Boolean) as string[],
    }));

    return [...teamMembers, ...projectItems, ...blogPosts];
  }, []);

  // Fuse.js configuration
  const fuse = useMemo(() => {
    return new Fuse(searchableItems, {
      keys: [
        { name: 'title', weight: 0.4 },
        { name: 'description', weight: 0.3 },
        { name: 'keywords', weight: 0.2 },
        { name: 'category', weight: 0.1 },
      ],
      threshold: 0.4,
      includeScore: true,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
  }, [searchableItems]);

  // Search results
  const results = useMemo(() => {
    if (!query.trim()) return searchableItems.slice(0, 8);
    return fuse.search(query).map((r) => r.item);
  }, [query, fuse, searchableItems]);

  // Reset selection when results change
  useEffect(() => {
    requestAnimationFrame(() => {
      setSelectedIndex(0);
    });
  }, [results]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        setQuery('');
        setTimeout(() => inputRef.current?.focus(), 50);
      });
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % results.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            router.push(`/${locale}${results[selectedIndex].href}`);
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [results, selectedIndex, router, locale, onClose]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleItemClick = (item: SearchableItem) => {
    router.push(`/${locale}${item.href}`);
    onClose();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'blog':
        return '📝';
      case 'project':
        return '🚀';
      case 'team':
        return '👤';
      default:
        return '📄';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'blog':
        return locale === 'zh' ? '博客' : 'Blog';
      case 'project':
        return locale === 'zh' ? '项目' : 'Project';
      case 'team':
        return locale === 'zh' ? '团队' : 'Team';
      default:
        return type;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative flex min-h-full items-start justify-center p-4 pt-[15vh]">
        <div
          className={`
            relative w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl
            ${isDark ? 'bg-zinc-900 border border-zinc-700' : 'bg-white border border-zinc-200'}
          `}
          role="dialog"
          aria-modal="true"
          aria-label="Search"
        >
          {/* Search Input */}
          <div className={`flex items-center gap-3 px-4 py-3 border-b ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
            <svg
              className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={locale === 'zh' ? '搜索文章、项目、团队成员...' : 'Search posts, projects, team members...'}
              className={`flex-1 bg-transparent text-lg outline-none ${
                isDark ? 'text-white placeholder-zinc-500' : 'text-zinc-900 placeholder-zinc-400'
              }`}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <kbd
              className={`hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${
                isDark ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
              }`}
            >
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
            {results.length === 0 ? (
              <div className={`py-8 text-center ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {locale === 'zh' ? '没有找到结果' : 'No results found'}
              </div>
            ) : (
              <ul className="space-y-1">
                {results.map((item, index) => (
                  <li key={item.id}>
                    <button
                      data-index={index}
                      onClick={() => handleItemClick(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`
                        w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-colors
                        ${index === selectedIndex
                          ? isDark
                            ? 'bg-cyan-600/20 text-white'
                            : 'bg-cyan-50 text-cyan-900'
                          : isDark
                            ? 'hover:bg-zinc-800 text-zinc-300'
                            : 'hover:bg-zinc-50 text-zinc-700'
                        }
                      `}
                    >
                      <span className="text-xl flex-shrink-0 mt-0.5">{getTypeIcon(item.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{item.title}</span>
                          <span
                            className={`
                              flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full
                              ${isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}
                            `}
                          >
                            {getTypeLabel(item.type)}
                          </span>
                        </div>
                        <p
                          className={`text-sm mt-0.5 line-clamp-2 ${
                            index === selectedIndex
                              ? isDark
                                ? 'text-zinc-300'
                                : 'text-zinc-600'
                              : isDark
                                ? 'text-zinc-500'
                                : 'text-zinc-500'
                          }`}
                        >
                          {item.description}
                        </p>
                      </div>
                      {index === selectedIndex && (
                        <svg
                          className={`w-4 h-4 flex-shrink-0 mt-1.5 ${
                            isDark ? 'text-cyan-400' : 'text-cyan-600'
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div
            className={`flex items-center justify-between px-4 py-2 border-t text-xs ${
              isDark ? 'border-zinc-700 text-zinc-500' : 'border-zinc-200 text-zinc-400'
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>↑</kbd>
                <kbd className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>↓</kbd>
                <span className="ml-1">{locale === 'zh' ? '导航' : 'Navigate'}</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>↵</kbd>
                <span className="ml-1">{locale === 'zh' ? '选择' : 'Select'}</span>
              </span>
            </div>
            <span>
              {locale === 'zh' ? `${results.length} 个结果` : `${results.length} results`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Search Button Component
// ============================================================================

interface SearchButtonProps {
  onClick: () => void;
  locale?: string;
}

export function SearchButton({ onClick, locale = 'en' }: SearchButtonProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
        ${isDark
          ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300 border border-zinc-700'
          : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 border border-zinc-200'
        }
      `}
      aria-label={locale === 'zh' ? '搜索' : 'Search'}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <span className="hidden sm:inline">{locale === 'zh' ? '搜索...' : 'Search...'}</span>
      <kbd
        className={`
          hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium rounded
          ${isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-500'}
        `}
      >
        <span>⌘</span>
        <span>K</span>
      </kbd>
    </button>
  );
}

// ============================================================================
// Hook: useSearchKeyboard
// ============================================================================

export function useSearchKeyboard(onOpen: () => void, isOpen: boolean) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onOpen, isOpen]);
}

// ============================================================================
// Export
// ============================================================================

export default SearchModal;