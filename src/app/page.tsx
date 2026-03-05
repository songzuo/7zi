"use client";

import { useState } from "react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("首页");

  const navItems = ["首页", "关于", "团队", "博客", "联系"];

  const updates = [
    {
      title: "7zi Studio 官网正式上线",
      time: "刚刚",
      type: "公告",
      color: "bg-purple-500",
    },
    {
      title: "团队正在开发新一代AI产品",
      time: "2小时前",
      type: "项目",
      color: "bg-blue-500",
    },
    {
      title: "新成员加入7zi Studio",
      time: "昨天",
      type: "团队",
      color: "bg-green-500",
    },
    {
      title: "完成产品原型设计",
      time: "2天前",
      type: "里程碑",
      color: "bg-orange-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* 导航栏 */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-xl font-bold text-white">
              7
            </div>
            <span className="text-xl font-bold text-white">7zi Studio</span>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <button
                key={item}
                onClick={() => setActiveTab(item)}
                className={`relative text-sm font-medium transition-colors hover:text-white ${
                  activeTab === item ? "text-white" : "text-white/60"
                }`}
              >
                {item}
                {activeTab === item && (
                  <span className="absolute -bottom-1 left-0 h-0.5 w-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
                )}
              </button>
            ))}
          </div>
          <button className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-5 py-2 text-sm font-medium text-white transition-transform hover:scale-105">
            联系我们
          </button>
        </div>
      </nav>

      {/* Hero 区域 */}
      <section className="relative overflow-hidden px-6 py-24 md:py-32">
        {/* 背景装饰 */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-pink-500/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-sm text-purple-300">
            <span className="flex h-2 w-2 animate-pulse rounded-full bg-green-400" />
            团队运行中
          </div>
          <h1 className="mb-6 text-4xl font-bold leading-tight text-white md:text-6xl lg:text-7xl">
            欢迎来到{" "}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              7zi Studio
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-white/70 md:text-xl">
            我们是一个充满热情的创新团队，专注于打造卓越的数字体验。
            用技术创造价值，用创意点亮未来。
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button className="group relative overflow-hidden rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-3.5 font-semibold text-white transition-all hover:scale-105">
              <span className="relative z-10">了解更多</span>
              <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
            <button className="group flex items-center gap-2 rounded-full border border-white/20 px-8 py-3.5 font-semibold text-white transition-all hover:bg-white/10">
              <span>查看项目</span>
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* 团队工作实时更新区域 */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h2 className="mb-2 text-2xl font-bold text-white">团队实时更新</h2>
              <p className="text-white/60">了解7zi Studio的最新动态</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/60">
              <span className="flex h-2 w-2 animate-pulse rounded-full bg-green-400" />
              实时更新
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {updates.map((update, index) => (
              <div
                key={index}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg px-3 py-1 text-xs font-medium text-white ${update.color}`}>
                      {update.type}
                    </div>
                  </div>
                  <span className="text-sm text-white/50">{update.time}</span>
                </div>
                <h3 className="text-lg font-semibold text-white transition-colors group-hover:text-purple-300">
                  {update.title}
                </h3>
                <div className="absolute bottom-0 left-0 h-1 w-full origin-left scale-x-0 transform bg-gradient-to-r from-purple-500 to-pink-500 transition-transform group-hover:scale-x-100" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 底部 */}
      <footer className="border-t border-white/10 bg-black/20 px-6 py-8">
        <div className="mx-auto max-w-6xl flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-sm font-bold text-white">
              7
            </div>
            <span className="font-semibold text-white">7zi Studio</span>
          </div>
          <p className="text-sm text-white/50">
            © 2026 7zi Studio. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
