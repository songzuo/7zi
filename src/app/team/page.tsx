import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "团队成员 - 7zi Studio",
  description: "7zi Studio团队成员介绍 - 11位专业的AI代理，为您提供全方位的数字化服务",
};

// 团队成员数据
const teamMembers = [
  {
    id: 1,
    name: "智能体世界专家",
    emoji: "🌟",
    role: "战略规划 & 未来布局",
    description: "专注于AI Agent发展趋势和未来布局，为团队提供战略视角和前瞻性思考。",
    color: "from-yellow-400 to-orange-500",
  },
  {
    id: 2,
    name: "咨询师",
    emoji: "📚",
    role: "研究 & 分析",
    description: "深入研究市场动态和技术趋势，为项目提供数据驱动的决策支持。",
    color: "from-blue-400 to-indigo-600",
  },
  {
    id: 3,
    name: "架构师",
    emoji: "🏗️",
    role: "设计 & 规划",
    description: "设计系统架构和技术方案，确保项目的技术可行性和可扩展性。",
    color: "from-purple-400 to-pink-600",
  },
  {
    id: 4,
    name: "Executor",
    emoji: "⚡",
    role: "执行 & 实现",
    description: "高效执行任务，将设计方案转化为高质量的代码实现。",
    color: "from-green-400 to-emerald-600",
  },
  {
    id: 5,
    name: "系统管理员",
    emoji: "🛡️",
    role: "运维 & 部署",
    description: "负责系统运维、服务器管理和自动化部署，确保服务稳定运行。",
    color: "from-red-400 to-rose-600",
  },
  {
    id: 6,
    name: "测试员",
    emoji: "🧪",
    role: "测试 & 调试",
    description: "编写测试用例，进行功能测试和性能优化，保证产品质量。",
    color: "from-cyan-400 to-teal-600",
  },
  {
    id: 7,
    name: "设计师",
    emoji: "🎨",
    role: "UI & 前端设计",
    description: "打造美观易用的用户界面，提供优秀的用户体验设计。",
    color: "from-pink-400 to-rose-500",
  },
  {
    id: 8,
    name: "推广专员",
    emoji: "📣",
    role: "推广 & SEO",
    description: "制定推广策略，优化搜索引擎排名，提升品牌知名度。",
    color: "from-amber-400 to-yellow-600",
  },
  {
    id: 9,
    name: "销售客服",
    emoji: "💼",
    role: "销售 & 客服",
    description: "与客户沟通，了解需求，提供解决方案和优质的服务支持。",
    color: "from-violet-400 to-purple-600",
  },
  {
    id: 10,
    name: "财务",
    emoji: "💰",
    role: "会计 & 审计",
    description: "管理财务收支，进行成本核算和财务分析，确保资金健康。",
    color: "from-emerald-400 to-green-600",
  },
  {
    id: 11,
    name: "媒体",
    emoji: "📺",
    role: "媒体 & 宣传",
    description: "策划和制作内容，通过多渠道传播提升品牌影响力。",
    color: "from-sky-400 to-blue-600",
  },
];

export default function TeamPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-zinc-900 dark:text-white">
            7zi<span className="text-cyan-500">Studio</span>
          </Link>
          <div className="flex items-center gap-8">
            <Link href="/about" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">
              关于我们
            </Link>
            <Link href="/team" className="text-cyan-500 font-medium">
              团队成员
            </Link>
            <Link
              href="/contact"
              className="px-5 py-2 bg-cyan-500 text-white rounded-full font-medium hover:bg-cyan-600 transition-colors"
            >
              联系我们
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-6 bg-gradient-to-br from-cyan-900 via-purple-900 to-zinc-900">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            我们的团队
          </h1>
          <p className="text-xl text-zinc-300 max-w-2xl mx-auto">
            11位各具专长的AI代理，组成一个高效协作的智能团队
          </p>
        </div>
      </section>

      {/* Team Members Grid */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="group relative bg-white dark:bg-zinc-900 rounded-3xl p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                {/* Gradient border effect */}
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${member.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10`} />
                <div className="absolute inset-0 rounded-3xl bg-white dark:bg-zinc-900 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-800 transition-colors duration-300 -z-10" />
                
                <div className="text-5xl mb-4">{member.emoji}</div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">
                  {member.name}
                </h3>
                <p className={`text-sm font-medium bg-gradient-to-r ${member.color} bg-clip-text text-transparent mb-4`}>
                  {member.role}
                </p>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                  {member.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-cyan-500 to-purple-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            准备好与我们合作了吗？
          </h2>
          <p className="text-xl text-white/80 mb-8">
            让我们一起打造您的数字项目
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 bg-white text-cyan-600 px-8 py-4 rounded-full font-semibold text-lg hover:bg-cyan-50 transition-colors"
          >
            联系我们
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-zinc-900 text-zinc-400">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-2xl font-bold text-white">
              7zi<span className="text-cyan-500">Studio</span>
            </div>
            <div className="flex gap-8">
              <Link href="/" className="hover:text-white transition-colors">首页</Link>
              <Link href="/about" className="hover:text-white transition-colors">关于我们</Link>
              <Link href="/team" className="hover:text-white transition-colors">团队成员</Link>
            </div>
            <div className="text-sm">
              © 2024 7zi Studio. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
