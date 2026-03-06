"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// 团队成员数据
const teamMembers = [
  {
    id: 1,
    name: "智能体世界专家",
    emoji: "🌟",
    role: "战略规划 & 未来布局",
    description: "专注于 AI Agent 发展趋势和未来布局，为团队提供战略视角和前瞻性思考。",
    color: "from-yellow-400 to-orange-500",
    skills: ["战略分析", "趋势预测", "创新思维"],
    availability: "全天候",
  },
  {
    id: 2,
    name: "咨询师",
    emoji: "📚",
    role: "研究 & 分析",
    description: "深入研究市场动态和技术趋势，为项目提供数据驱动的决策支持。",
    color: "from-blue-400 to-indigo-600",
    skills: ["市场研究", "数据分析", "决策支持"],
    availability: "全天候",
  },
  {
    id: 3,
    name: "架构师",
    emoji: "🏗️",
    role: "设计 & 规划",
    description: "设计系统架构和技术方案，确保项目的技术可行性和可扩展性。",
    color: "from-purple-400 to-pink-600",
    skills: ["系统架构", "技术选型", "方案设计"],
    availability: "全天候",
  },
  {
    id: 4,
    name: "Executor",
    emoji: "⚡",
    role: "执行 & 实现",
    description: "高效执行任务，将设计方案转化为高质量的代码实现。",
    color: "from-green-400 to-emerald-600",
    skills: ["代码实现", "任务执行", "效率优化"],
    availability: "全天候",
  },
  {
    id: 5,
    name: "系统管理员",
    emoji: "🛡️",
    role: "运维 & 部署",
    description: "负责系统运维、服务器管理和自动化部署，确保服务稳定运行。",
    color: "from-red-400 to-rose-600",
    skills: ["系统运维", "自动化部署", "安全加固"],
    availability: "全天候",
  },
  {
    id: 6,
    name: "测试员",
    emoji: "🧪",
    role: "测试 & 调试",
    description: "编写测试用例，进行功能测试和性能优化，保证产品质量。",
    color: "from-cyan-400 to-teal-600",
    skills: ["功能测试", "性能优化", "质量保障"],
    availability: "全天候",
  },
  {
    id: 7,
    name: "设计师",
    emoji: "🎨",
    role: "UI & 前端设计",
    description: "打造美观易用的用户界面，提供优秀的用户体验设计。",
    color: "from-pink-400 to-rose-500",
    skills: ["UI 设计", "用户体验", "视觉创意"],
    availability: "全天候",
  },
  {
    id: 8,
    name: "推广专员",
    emoji: "📣",
    role: "推广 & SEO",
    description: "制定推广策略，优化搜索引擎排名，提升品牌知名度。",
    color: "from-amber-400 to-yellow-600",
    skills: ["SEO 优化", "内容营销", "品牌推广"],
    availability: "全天候",
  },
  {
    id: 9,
    name: "销售客服",
    emoji: "💼",
    role: "销售 & 客服",
    description: "与客户沟通，了解需求，提供解决方案和优质的服务支持。",
    color: "from-violet-400 to-purple-600",
    skills: ["客户沟通", "需求分析", "解决方案"],
    availability: "全天候",
  },
  {
    id: 10,
    name: "财务",
    emoji: "💰",
    role: "会计 & 审计",
    description: "管理财务收支，进行成本核算和财务分析，确保资金健康。",
    color: "from-emerald-400 to-green-600",
    skills: ["财务管理", "成本控制", "财务分析"],
    availability: "全天候",
  },
  {
    id: 11,
    name: "媒体",
    emoji: "📺",
    role: "媒体 & 宣传",
    description: "策划和制作内容，通过多渠道传播提升品牌影响力。",
    color: "from-sky-400 to-blue-600",
    skills: ["内容策划", "媒体运营", "品牌传播"],
    availability: "全天候",
  },
];

// 动画组件 - 滚动时淡入
function FadeInSection({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById(`team-fade-${delay}`);
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      id={`team-fade-${delay}`}
      className={`transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
    >
      {children}
    </div>
  );
}

// 团队成员卡片组件
function TeamMemberCard({ member, index }: { member: typeof teamMembers[0]; index: number }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group relative bg-white dark:bg-zinc-900 rounded-3xl p-8 hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:border-transparent"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Animated Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${member.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
      
      {/* Animated Border */}
      <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${member.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-[2px]`} />
      <div className="absolute inset-[2px] rounded-3xl bg-white dark:bg-zinc-900 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-800 transition-colors duration-500 -z-10" />
      
      {/* Availability Badge */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 rounded-full border border-green-500/20">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-xs text-green-600 dark:text-green-400 font-medium">{member.availability}</span>
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Emoji with Float Animation */}
        <div className={`text-6xl mb-6 transition-transform duration-500 ${isHovered ? "scale-110 animate-float" : ""}`}>
          {member.emoji}
        </div>
        
        {/* Name and Role */}
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-600 group-hover:to-purple-600 transition-all duration-300">
          {member.name}
        </h3>
        <p className={`text-sm font-semibold bg-gradient-to-r ${member.color} bg-clip-text text-transparent mb-4`}>
          {member.role}
        </p>
        
        {/* Skills Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {member.skills.map((skill, i) => (
            <span
              key={i}
              className={`text-xs px-3 py-1.5 rounded-full bg-gradient-to-r ${member.color} text-white font-medium shadow-sm`}
            >
              {skill}
            </span>
          ))}
        </div>
        
        {/* Description */}
        <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
          {member.description}
        </p>
        
        {/* Hover Glow Effect */}
        <div className={`absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-br ${member.color} rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-500`} />
      </div>
    </div>
  );
}

export default function TeamContent() {
  const [mounted] = useState(true); // Initialize as mounted for SSR safety
  const [activeFilter, setActiveFilter] = useState("all");

  const baseUrl = "https://7zi.studio";

  const filters = [
    { id: "all", label: "全部", emoji: "👥" },
    { id: "strategy", label: "战略", emoji: "🌟" },
    { id: "tech", label: "技术", emoji: "💻" },
    { id: "creative", label: "创意", emoji: "🎨" },
    { id: "business", label: "商务", emoji: "💼" },
  ];

  const filteredMembers = teamMembers.filter((member) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "strategy") return member.id <= 2;
    if (activeFilter === "tech") return member.id >= 3 && member.id <= 6;
    if (activeFilter === "creative") return member.id === 7 || member.id === 11;
    if (activeFilter === "business") return member.id >= 8;
    return true;
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800 transition-all duration-300 ${mounted ? "translate-y-0" : "-translate-y-full"}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-zinc-900 dark:text-white hover:text-cyan-500 transition-colors">
            7zi<span className="text-cyan-500">Studio</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/about" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">
              关于我们
            </Link>
            <Link href="/team" className="text-cyan-500 font-medium">
              团队成员
            </Link>
            <Link
              href="/contact"
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-full font-medium hover:shadow-lg hover:scale-105 transition-all duration-300"
            >
              联系我们
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-24 px-6 bg-gradient-to-br from-cyan-900 via-purple-900 to-zinc-900 relative overflow-hidden">
        {/* Animated Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px]" />
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 text-6xl animate-float opacity-20">🌟</div>
        <div className="absolute top-40 right-20 text-5xl animate-float opacity-20 delay-500">⚡</div>
        <div className="absolute bottom-20 left-1/4 text-7xl animate-float opacity-20 delay-1000">🎨</div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className={`transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-cyan-400 text-sm font-medium mb-6 border border-white/20">
              <span className="animate-pulse">✨</span>
              11 位 AI 专家
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight">
              我们的<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">团队</span>
            </h1>
            <p className="text-xl md:text-2xl text-zinc-300 max-w-2xl mx-auto leading-relaxed">
              从战略规划到执行落地，
              <span className="text-white font-semibold"> 每个环节都有专家</span> 为您护航
            </p>
          </div>
          
          {/* Stats */}
          <div className={`mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto transition-all duration-1000 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">11</div>
              <div className="text-zinc-400 text-sm">专业代理</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">100%</div>
              <div className="text-zinc-400 text-sm">覆盖率</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">24/7</div>
              <div className="text-zinc-400 text-sm">在线支持</div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Section */}
      <FadeInSection delay={100} className="py-12 px-6 bg-zinc-50 dark:bg-black sticky top-[73px] z-40 border-b border-zinc-200 dark:border-zinc-800 backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap justify-center gap-3">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`px-5 py-2.5 rounded-full font-medium transition-all duration-300 flex items-center gap-2 ${
                  activeFilter === filter.id
                    ? "bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg scale-105"
                    : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <span>{filter.emoji}</span>
                <span>{filter.label}</span>
              </button>
            ))}
          </div>
        </div>
      </FadeInSection>

      {/* Team Members Grid */}
      <FadeInSection delay={200} className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.map((member, index) => (
              <TeamMemberCard key={member.id} member={member} index={index} />
            ))}
          </div>
          
          {filteredMembers.length === 0 && (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-zinc-500 dark:text-zinc-400 text-lg">暂无匹配的团队成员</p>
            </div>
          )}
        </div>
      </FadeInSection>

      {/* Team Collaboration Section */}
      <FadeInSection delay={400} className="py-24 px-6 bg-white dark:bg-zinc-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-full text-cyan-600 dark:text-cyan-400 text-sm font-medium mb-4 border border-cyan-500/20">
              <span>🤝</span>
              团队协作
            </div>
            <h2 className="text-4xl font-bold text-zinc-900 dark:text-white mb-4">
              高效协作模式
            </h2>
            <p className="text-lg text-zinc-500 dark:text-zinc-400">
              11 位 AI 代理无缝配合，确保项目顺利推进
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: "战略 → 执行",
                desc: "从智能体世界专家的战略规划，到 Executor 的高效实现",
                gradient: "from-yellow-500 to-green-600",
                emoji: "🎯",
              },
              {
                title: "设计 → 开发",
                desc: "设计师的创意方案，由架构师和 Executor 完美实现",
                gradient: "from-pink-500 to-purple-600",
                emoji: "✨",
              },
              {
                title: "测试 → 部署",
                desc: "测试员严格把关，系统管理员稳定部署上线",
                gradient: "from-cyan-500 to-blue-600",
                emoji: "🚀",
              },
              {
                title: "推广 → 转化",
                desc: "推广专员引流，销售客服转化，财务精准核算",
                gradient: "from-amber-500 to-red-600",
                emoji: "📈",
              },
            ].map((item, index) => (
              <div
                key={index}
                className="group relative bg-zinc-50 dark:bg-black rounded-2xl p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-zinc-200 dark:border-zinc-800 overflow-hidden"
              >
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${item.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`} />
                <div className="flex items-start gap-4">
                  <div className="text-4xl group-hover:scale-110 transition-transform duration-300">{item.emoji}</div>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">{item.title}</h3>
                    <p className="text-zinc-600 dark:text-zinc-400">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </FadeInSection>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-white/10 rounded-full blur-3xl animate-pulse" />
        
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            准备好与我们合作了吗？
          </h2>
          <p className="text-xl text-white/80 mb-10">
            11 位 AI 专家已就绪，随时为您打造卓越数字项目
          </p>
          <Link
            href="/contact"
            className="group inline-flex items-center gap-3 bg-white text-cyan-600 px-10 py-5 rounded-full font-semibold text-lg hover:bg-cyan-50 transition-all duration-300 hover:shadow-2xl hover:scale-105"
          >
            联系我们
            <span className="group-hover:translate-x-2 transition-transform duration-300">→</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-zinc-900 text-zinc-400 border-t border-zinc-800">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-2xl font-bold text-white">
              7zi<span className="text-cyan-500">Studio</span>
            </div>
            <div className="flex gap-8">
              <Link href="/" className="hover:text-white transition-colors">首页</Link>
              <Link href="/about" className="hover:text-white transition-colors">关于我们</Link>
              <Link href="/team" className="hover:text-white transition-colors">团队成员</Link>
              <Link href="/contact" className="hover:text-white transition-colors">联系我们</Link>
            </div>
            <div className="text-sm">
              © 2024 7zi Studio. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* Structured Data for Team Page */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "7zi Studio 团队成员",
            description: "11 位专业的 AI 代理团队介绍",
            url: `${baseUrl}/team`,
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: teamMembers.length,
              itemListElement: teamMembers.map((member, index) => ({
                "@type": "ListItem",
                position: index + 1,
                item: {
                  "@type": "Person",
                  name: member.name,
                  jobTitle: member.role,
                  description: member.description,
                },
              })),
            },
          }),
        }}
      />
    </div>
  );
}
