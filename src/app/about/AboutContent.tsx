"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const baseUrl = "https://7zi.studio";

// 团队成员数据 - 增强版，包含更多详细信息
const teamMembers = [
  {
    id: 1,
    name: "智能体世界专家",
    emoji: "🌟",
    role: "战略规划 & 未来布局",
    description: "专注于 AI Agent 发展趋势和未来布局，为团队提供战略视角和前瞻性思考。",
    color: "from-yellow-400 to-orange-500",
    skills: ["战略分析", "趋势预测", "创新思维"],
    stats: { projects: "50+", experience: "5年" },
    achievements: ["行业趋势报告", "战略规划方案"],
  },
  {
    id: 2,
    name: "咨询师",
    emoji: "📚",
    role: "研究 & 分析",
    description: "深入研究市场动态和技术趋势，为项目提供数据驱动的决策支持。",
    color: "from-blue-400 to-indigo-600",
    skills: ["市场研究", "数据分析", "决策支持"],
  },
  {
    id: 3,
    name: "架构师",
    emoji: "🏗️",
    role: "设计 & 规划",
    description: "设计系统架构和技术方案，确保项目的技术可行性和可扩展性。",
    color: "from-purple-400 to-pink-600",
    skills: ["系统架构", "技术选型", "方案设计"],
  },
  {
    id: 4,
    name: "Executor",
    emoji: "⚡",
    role: "执行 & 实现",
    description: "高效执行任务，将设计方案转化为高质量的代码实现。",
    color: "from-green-400 to-emerald-600",
    skills: ["代码实现", "任务执行", "效率优化"],
  },
  {
    id: 5,
    name: "系统管理员",
    emoji: "🛡️",
    role: "运维 & 部署",
    description: "负责系统运维、服务器管理和自动化部署，确保服务稳定运行。",
    color: "from-red-400 to-rose-600",
    skills: ["系统运维", "自动化部署", "安全加固"],
  },
  {
    id: 6,
    name: "测试员",
    emoji: "🧪",
    role: "测试 & 调试",
    description: "编写测试用例，进行功能测试和性能优化，保证产品质量。",
    color: "from-cyan-400 to-teal-600",
    skills: ["功能测试", "性能优化", "质量保障"],
  },
  {
    id: 7,
    name: "设计师",
    emoji: "🎨",
    role: "UI & 前端设计",
    description: "打造美观易用的用户界面，提供优秀的用户体验设计。",
    color: "from-pink-400 to-rose-500",
    skills: ["UI 设计", "用户体验", "视觉创意"],
  },
  {
    id: 8,
    name: "推广专员",
    emoji: "📣",
    role: "推广 & SEO",
    description: "制定推广策略，优化搜索引擎排名，提升品牌知名度。",
    color: "from-amber-400 to-yellow-600",
    skills: ["SEO 优化", "内容营销", "品牌推广"],
  },
  {
    id: 9,
    name: "销售客服",
    emoji: "💼",
    role: "销售 & 客服",
    description: "与客户沟通，了解需求，提供解决方案和优质的服务支持。",
    color: "from-violet-400 to-purple-600",
    skills: ["客户沟通", "需求分析", "解决方案"],
  },
  {
    id: 10,
    name: "财务",
    emoji: "💰",
    role: "会计 & 审计",
    description: "管理财务收支，进行成本核算和财务分析，确保资金健康。",
    color: "from-emerald-400 to-green-600",
    skills: ["财务管理", "成本控制", "财务分析"],
  },
  {
    id: 11,
    name: "媒体",
    emoji: "📺",
    role: "媒体 & 宣传",
    description: "策划和制作内容，通过多渠道传播提升品牌影响力。",
    color: "from-sky-400 to-blue-600",
    skills: ["内容策划", "媒体运营", "品牌传播"],
  },
];

// 发展历程数据
const timeline = [
  {
    year: "2024",
    title: "创立起源",
    description: "7zi Studio 正式成立，开启 AI 驱动数字工作室新纪元",
    emoji: "🚀",
    color: "from-cyan-500 to-blue-600",
  },
  {
    year: "2024",
    title: "团队组建",
    description: "11 位 AI 代理全部就位，形成完整的协作体系",
    emoji: "👥",
    color: "from-purple-500 to-pink-600",
  },
  {
    year: "2025",
    title: "服务扩展",
    description: "服务范围扩展至网站开发、品牌设计、SEO 优化等多领域",
    emoji: "📈",
    color: "from-green-500 to-emerald-600",
  },
  {
    year: "2025",
    title: "技术升级",
    description: "引入最新 AI 技术，持续优化团队协作效率和输出质量",
    emoji: "⚡",
    color: "from-amber-500 to-orange-600",
  },
];

// 合作伙伴/客户
const partners = [
  { name: "TechCorp", logo: "💻", color: "from-blue-500 to-cyan-500" },
  { name: "InnovateLab", logo: "🔬", color: "from-purple-500 to-pink-500" },
  { name: "DigitalFirst", logo: "🎯", color: "from-red-500 to-orange-500" },
  { name: "CloudNine", logo: "☁️", color: "from-sky-500 to-blue-600" },
  { name: "FutureSoft", logo: "🤖", color: "from-green-500 to-emerald-600" },
  { name: "DataFlow", logo: "📊", color: "from-indigo-500 to-purple-600" },
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

    const element = document.getElementById(`fade-section-${delay}`);
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      id={`fade-section-${delay}`}
      className={`transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
    >
      {children}
    </div>
  );
}

export default function AboutContent() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black overflow-x-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Hero Section */}
      <section className="relative py-32 px-6 bg-gradient-to-br from-zinc-900 via-zinc-800 to-black dark:from-black dark:via-zinc-900 dark:to-zinc-800 overflow-hidden">
        {/* Animated Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className={`transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-cyan-400 text-sm font-medium mb-6 border border-white/20">
              <span className="animate-pulse">✨</span>
              创新的 AI 驱动工作室
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight">
              关于{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 animate-gradient bg-[length:200%_200%]">
                7zi Studio
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-zinc-300 max-w-2xl mx-auto leading-relaxed">
              重新定义团队协作 — 由 11 位 AI 代理组成的智能团队，
              <span className="text-white font-medium"> 24/7 不间断</span> 为您创造数字价值
            </p>
          </div>
          
          {/* Scroll Indicator */}
          <div className={`mt-16 transition-all duration-1000 delay-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
            <div className="flex flex-col items-center gap-2 text-zinc-400 animate-bounce">
              <span className="text-sm">探索更多</span>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Studio Introduction */}
      <FadeInSection delay={100} className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 md:p-12 shadow-2xl border border-zinc-200 dark:border-zinc-800 hover:border-cyan-500/50 transition-colors duration-500">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-2xl flex items-center justify-center text-2xl">
                🚀
              </div>
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">
                7zi Studio 简介
              </h2>
            </div>
            <div className="space-y-6 text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
              <p className="hover:text-zinc-900 dark:hover:text-white transition-colors">
                <strong className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-purple-600 dark:from-cyan-400 dark:to-purple-400 font-bold">
                  7zi Studio
                </strong>{" "}
                是一个创新的数字工作室，我们重新定义了团队的概念 — 
                由 11 位专业的 AI 代理组成，各自发挥专长，协同完成各类数字项目。
              </p>
              <p className="hover:text-zinc-900 dark:hover:text-white transition-colors">
                我们的团队结合了人类创意的灵性和 AI 的高效执行力，从战略规划到产品交付，
                从设计到推广，每一个环节都有专业的 AI 成员负责。
              </p>
              <p className="hover:text-zinc-900 dark:hover:text-white transition-colors">
                无论是网站开发、品牌设计、SEO 优化还是内容营销，7zi Studio 都能为您提供
                一站式的数字化解决方案。
              </p>
            </div>
            
            {/* Stats Cards - 增强版 */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="group text-center p-6 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-2xl hover:shadow-lg hover:scale-105 transition-all duration-300 border border-cyan-200/50 dark:border-cyan-800/50">
                <div className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">11</div>
                <div className="text-zinc-600 dark:text-zinc-400 font-medium">AI 专家</div>
                <div className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">各司其职</div>
              </div>
              <div className="group text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl hover:shadow-lg hover:scale-105 transition-all duration-300 border border-purple-200/50 dark:border-purple-800/50">
                <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">50+</div>
                <div className="text-zinc-600 dark:text-zinc-400 font-medium">完成项目</div>
                <div className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">客户满意</div>
              </div>
              <div className="group text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl hover:shadow-lg hover:scale-105 transition-all duration-300 border border-green-200/50 dark:border-green-800/50">
                <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">100%</div>
                <div className="text-zinc-600 dark:text-zinc-400 font-medium">交付率</div>
                <div className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">准时交付</div>
              </div>
              <div className="group text-center p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl hover:shadow-lg hover:scale-105 transition-all duration-300 border border-amber-200/50 dark:border-amber-800/50">
                <div className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-2">24/7</div>
                <div className="text-zinc-600 dark:text-zinc-400 font-medium">在线支持</div>
                <div className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">随时响应</div>
              </div>
            </div>
          </div>
        </div>
      </FadeInSection>

      {/* Team Members */}
      <FadeInSection delay={300} className="py-24 px-6 bg-white dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-full text-cyan-600 dark:text-cyan-400 text-sm font-medium mb-4 border border-cyan-500/20">
              <span>👥</span>
              核心团队
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-4">
              我们的团队成员
            </h2>
            <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">
              11 位各具专长的 AI 代理，组成一个高效协作的智能团队
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamMembers.map((member, index) => (
              <div
                key={member.id}
                className="group relative bg-zinc-50 dark:bg-black rounded-3xl p-8 hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:border-transparent"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Animated Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${member.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                
                {/* Gradient Border on Hover */}
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${member.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-sm`} />
                <div className="absolute inset-[2px] rounded-3xl bg-zinc-50 dark:bg-black group-hover:bg-white dark:group-hover:bg-zinc-900 transition-colors duration-500 -z-10" />
                
                {/* Content */}
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-5xl group-hover:scale-110 transition-transform duration-300">{member.emoji}</div>
                    <div className="flex gap-1">
                      {member.skills.slice(0, 2).map((skill, i) => (
                        <span key={i} className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${member.color} text-white/90`}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-600 group-hover:to-purple-600 transition-all duration-300">
                    {member.name}
                  </h3>
                  <p className={`text-sm font-medium bg-gradient-to-r ${member.color} bg-clip-text text-transparent mb-4`}>
                    {member.role}
                  </p>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mb-4">
                    {member.description}
                  </p>
                  
                  {/* 增强：添加更多成员信息 */}
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">24/7 在线</span>
                    </div>
                    <div className="flex gap-3">
                      {member.achievements?.map((achievement, i) => (
                        <span key={i} className="text-xs text-zinc-400 dark:text-zinc-500" title={achievement}>
                          ✓
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Hover Glow Effect */}
                <div className={`absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-br ${member.color} rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-500`} />
              </div>
            ))}
          </div>
        </div>
      </FadeInSection>

      {/* Timeline Section - 发展历程 */}
      <FadeInSection delay={400} className="py-24 px-6 bg-white dark:bg-zinc-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-full text-cyan-600 dark:text-cyan-400 text-sm font-medium mb-4 border border-cyan-500/20">
              <span>📅</span>
              发展历程
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-4">
              我们的成长轨迹
            </h2>
            <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">
              从初创到成长，每一步都与客户共同进步
            </p>
          </div>
          
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500 via-purple-500 to-pink-500" />
            
            <div className="space-y-12">
              {timeline.map((item, index) => (
                <div 
                  key={index}
                  className={`relative flex items-center gap-8 md:gap-0 ${index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}
                >
                  <div className={`flex-1 ${index % 2 === 0 ? "md:text-right md:pr-12" : "md:text-left md:pl-12"} text-center`}>
                    <div className="inline-block bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-800 hover:shadow-xl hover:border-cyan-500/50 transition-all duration-300 group">
                      <div className="flex items-center gap-2 mb-2 justify-start">
                        <span className="text-2xl">{item.emoji}</span>
                        <span className={`text-lg font-bold bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>
                          {item.year}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-zinc-600 dark:text-zinc-400 text-sm">{item.description}</p>
                    </div>
                  </div>
                  <div className="absolute left-8 md:left-1/2 md:-translate-x-1/2 w-16 h-16 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg z-10 border-4 border-white dark:border-zinc-900">
                    {index + 1}
                  </div>
                  <div className="flex-1 hidden md:block" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </FadeInSection>

      {/* Partners Section - 合作伙伴 */}
      <FadeInSection delay={450} className="py-24 px-6 bg-gradient-to-br from-zinc-100 via-zinc-50 to-zinc-100 dark:from-zinc-900 dark:via-black dark:to-zinc-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-full text-green-600 dark:text-green-400 text-sm font-medium mb-4 border border-green-500/20">
              <span>🤝</span>
              合作伙伴
            </div>
            <h2 className="text-4xl font-bold text-zinc-900 dark:text-white mb-4">
              信赖我们的伙伴
            </h2>
            <p className="text-lg text-zinc-500 dark:text-zinc-400">
              与优秀企业携手，共创数字化未来
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {partners.map((partner, index) => (
              <div
                key={index}
                className="group relative bg-white dark:bg-zinc-900 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-zinc-200 dark:border-zinc-800 overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${partner.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                <div className="text-4xl group-hover:scale-110 transition-transform duration-300">{partner.logo}</div>
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                  {partner.name}
                </span>
              </div>
            ))}
          </div>
          
          <p className="text-center text-zinc-500 dark:text-zinc-500 mt-12 text-sm">
            已有 <span className="font-bold text-cyan-600 dark:text-cyan-400">50+</span> 企业选择与我们合作
          </p>
        </div>
      </FadeInSection>

      {/* Values Section */}
      <FadeInSection delay={500} className="py-24 px-6 bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-black dark:via-zinc-900 dark:to-black">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full text-purple-600 dark:text-purple-400 text-sm font-medium mb-4 border border-purple-500/20">
              <span>💎</span>
              核心价值观
            </div>
            <h2 className="text-4xl font-bold text-zinc-900 dark:text-white mb-4">
              我们的理念
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { emoji: "🚀", title: "高效协作", desc: "11 位 AI 代理协同工作，优势互补，确保每个项目都能高效推进。", color: "from-cyan-500 to-blue-600" },
              { emoji: "💡", title: "创新驱动", desc: "不断探索新技术、新方案，为客户提供最具创新性的解决方案。", color: "from-purple-500 to-pink-600" },
              { emoji: "🎯", title: "专注品质", desc: "严格把控每个环节的质量，确保交付成果超出客户预期。", color: "from-amber-500 to-orange-600" },
              { emoji: "🤝", title: "客户至上", desc: "深入理解客户需求，提供个性化的服务和支持。", color: "from-green-500 to-emerald-600" },
            ].map((value, index) => (
              <div
                key={index}
                className="group relative bg-white dark:bg-zinc-900 rounded-2xl p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-zinc-200 dark:border-zinc-800 overflow-hidden"
              >
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${value.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`} />
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{value.emoji}</div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">{value.title}</h3>
                <p className="text-zinc-600 dark:text-zinc-400">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </FadeInSection>

      {/* Process Section */}
      <FadeInSection delay={700} className="py-24 px-6 bg-white dark:bg-zinc-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-full text-green-600 dark:text-green-400 text-sm font-medium mb-4 border border-green-500/20">
              <span>⚙️</span>
              工作流程
            </div>
            <h2 className="text-4xl font-bold text-zinc-900 dark:text-white mb-4">
              我们如何工作
            </h2>
          </div>
          
          <div className="relative">
            {/* Connection Line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500 via-purple-500 to-pink-500 md:left-1/2 md:-translate-x-1/2" />
            
            <div className="space-y-12">
              {[
                { step: "01", title: "需求分析", desc: "深入了解您的目标和需求，制定详细的项目计划", emoji: "📋" },
                { step: "02", title: "方案设计", desc: "架构师和设计师协作，创建完整的技术和视觉方案", emoji: "🎨" },
                { step: "03", title: "开发实现", desc: "Executor 高效编码，测试员同步进行质量把控", emoji: "⚡" },
                { step: "04", title: "交付上线", desc: "系统管理员部署上线，推广专员启动营销计划", emoji: "🚀" },
              ].map((item, index) => (
                <div key={index} className={`relative flex items-center gap-8 md:gap-0 ${index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}>
                  <div className={`flex-1 ${index % 2 === 0 ? "md:text-right md:pr-12" : "md:text-left md:pl-12"} text-center md:text-inherit`}>
                    <div className="inline-block bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-800 hover:shadow-xl hover:border-cyan-500/50 transition-all duration-300">
                      <div className="text-3xl mb-2">{item.emoji}</div>
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">{item.title}</h3>
                      <p className="text-zinc-600 dark:text-zinc-400 text-sm">{item.desc}</p>
                    </div>
                  </div>
                  <div className="absolute left-8 md:left-1/2 md:-translate-x-1/2 w-16 h-16 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg z-10">
                    {item.step}
                  </div>
                  <div className="flex-1 hidden md:block" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </FadeInSection>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-white/10 rounded-full blur-3xl" />
        
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            准备好与我们合作了吗？
          </h2>
          <p className="text-xl text-white/80 mb-10">
            让我们一起打造您的数字项目，创造无限可能
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

      {/* Structured Data for About Page */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "AboutPage",
            name: "关于 7zi Studio",
            description: "了解 7zi Studio 团队 - 由 11 位 AI 代理组成的创新数字工作室",
            url: `${baseUrl}/about`,
            mainEntity: {
              "@type": "Organization",
              name: "7zi Studio",
              description: "由 11 位 AI 代理组成的创新数字工作室",
              url: baseUrl,
              member: teamMembers.map((member) => ({
                "@type": "Person",
                name: member.name,
                jobTitle: member.role,
                description: member.description,
              })),
            },
          }),
        }}
      />
    </div>
  );
}
