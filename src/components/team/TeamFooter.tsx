'use client';

import React from 'react';
import { Link } from '@/i18n/routing';

interface TeamFooterProps {
  navItems: { key: string; label: string }[];
  copyright: string;
}

export function TeamFooter({ navItems, copyright }: TeamFooterProps) {
  return (
    <footer className="py-12 px-6 bg-zinc-900 text-zinc-400" role="contentinfo">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-2xl font-bold text-white">7zi<span className="text-cyan-500">Studio</span></div>
          <nav aria-label="Footer navigation">
            <ul className="flex gap-8">
              {navItems.map((item) => (
                <li key={item.key}>
                  <Link href={item.key === 'home' ? '/' : `/${item.key}`} className="hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="text-sm">{copyright}</div>
        </div>
      </div>
    </footer>
  );
}