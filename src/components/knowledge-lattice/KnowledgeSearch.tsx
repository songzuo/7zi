/**
 * 知识晶格搜索组件
 */

'use client';

import React, { useState, useCallback } from 'react';
import { LatticeNode, KnowledgeType } from '@/lib/agents/knowledge-lattice';

export interface KnowledgeSearchProps {
  nodes: LatticeNode[];
  onSearch: (results: LatticeNode[]) => void;
  placeholder?: string;
}

export default function KnowledgeSearch({
  nodes,
  onSearch,
  placeholder = '搜索知识节点...',
}: KnowledgeSearchProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = useCallback(
    (searchQuery: string) => {
      setQuery(searchQuery);

      if (!searchQuery.trim()) {
        onSearch(nodes);
        return;
      }

      const lowerQuery = searchQuery.toLowerCase();
      const results = nodes.filter(
        (node) =>
          node.content.toLowerCase().includes(lowerQuery) ||
          node.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
          node.type.toLowerCase().includes(lowerQuery)
      );

      onSearch(results);
    },
    [nodes, onSearch]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    onSearch(nodes);
  }, [nodes, onSearch]);

  return (
    <div className="relative">
      <div
        className={`flex items-center bg-slate-800 rounded-lg border transition-colors ${
          isFocused ? 'border-blue-500' : 'border-slate-700'
        }`}
      >
        {/* 搜索图标 */}
        <svg
          className="w-5 h-5 text-slate-400 ml-3"
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

        {/* 输入框 */}
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white px-3 py-2 outline-none placeholder:text-slate-500"
        />

        {/* 清除按钮 */}
        {query && (
          <button
            onClick={handleClear}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* 搜索提示 */}
      {query && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-slate-800 rounded-lg p-2 text-xs text-slate-400">
          按内容、标签或类型搜索
        </div>
      )}
    </div>
  );
}