import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "团队成员 - 7zi Studio",
  description: "7zi Studio团队成员介绍 - 11位专业的AI代理",
};

// 团队成员详细数据
const teamMembers = [
  {
    id: 1,
    name: "智能体世界专家",
    emoji: "🌟",
    role: "战略规划 & 未来布局",
    provider: "minimax",
    description: "专注于AI Agent发展趋势和未来布局，为团队提供战略视角和前瞻性思考。擅长从宏观角度分析行业趋势，帮助团队把握先机。",
    skills: ["趋势分析", "战略规划", "未来布局", "行业洞察"],
    color: "from-yellow-400 to-orange-500",
    bgColor: "bg-yellow-500",
  },
  {
    id: 2,
    name: "咨询师",
    emoji: "📚",
    role: "研究 & 分析",
    provider: "minimax",
    description: "深入研究市场动态和技术趋势，为项目提供数据驱动的决策支持。擅长收集、分析和解读各类数据，提供有价值的洞察。",
    skills: ["市场研究", "数据分析", "竞品分析", "报告撰写"],
    color: "from-blue-400 to-indigo-600",
    bgColor: "bg-blue-500",
  },
  {
    id: 3,
    name: "架构师",
    emoji: "🏗️",
    role: "设计 & 规划",
    provider: "self-claude",
    description: "设计系统架构和技术方案，确保项目的技术可行性和可扩展性。擅长构建稳健、可维护的系统架构。",
    skills: ["系统设计", "技术方案", "架构规划", "性能优化"],
    color: "from-purple-400 to-pink-600",
    bgColor: "bg-purple-500",
  },
  {
    id: 4,
    name: "Executor",
    emoji: "⚡",
    role: "执行 & 实现",
    provider: "volcengine",
    description: "高效执行任务，将设计方案转化为高质量的代码实现。擅长快速原型开发和功能实现。",
    skills: ["代码开发", "功能实现", "快速原型", "问题解决"],
    color: "from-green-400 to-emerald-600",
    bgColor: "bg-green-500",
  },
  {
    id: 5,
    name: "系统管理员",
    emoji: "🛡️",
    role: "运维 & 部署",
    provider: "bailian",
    description: "负责系统运维、服务器管理和自动化部署，确保服务稳定运行。擅长DevOps实践和自动化。",
    skills: ["服务器管理", "自动化部署", "监控运维", "安全加固"],
    color: "from-red-400 to-rose-600",
    bgColor: "bg-red-500",
  },
  {
    id: 6,
    name: "测试员",
    emoji: "🧪",
    role: "测试 & 调试",
    provider: "minimax",
    description: "编写测试用例，进行功能测试和性能优化，保证产品质量。擅长测试策略和缺陷定位。",
    skills: ["测试用例", "功能测试", "性能测试", "缺陷追踪"],
    color: "from-cyan-400 to-teal-600",
    bgColor: "bg-cyan-500",
  },
  {
    id: 7,
    name: "设计师",
    emoji: "🎨",
    role: "UI & 前端设计",
    provider: "self-claude",
    description: "打造美观易用的用户界面，提供优秀的用户体验设计。专注于现代简约风格和交互设计。",
    skills: ["UI设计", "用户体验", "交互设计", "品牌设计"],
    color: "from-pink-400 to-rose-500",
    bgColor: "bg-pink-500",
  },
  {
    id: 8,
    name: "推广专员",
    emoji: "📣",
    role: "推广 & SEO",
    provider: "volcengine",
    description: "制定推广策略，优化搜索引擎排名，提升品牌知名度。擅长数据驱动的营销策略。",
    skills: ["SEO优化", "内容营销", "社交媒体", "数据分析"],
    color: "from-amber-400 to-yellow-600",
    bgColor: "bg-amber-500",
  },
  {
    id: 9,
    name: "销售客服",
    emoji: "💼",
    role: "销售 & 客服",
    provider: "bailian",
    description: "与客户沟通，了解需求，提供解决方案和优质的服务支持。擅长建立长期客户关系。",
    skills: ["客户沟通", "需求分析", "方案演示", "售后支持"],
    color: "from-violet-400 to-purple-600",
    bgColor: "bg-violet-500",
  },
  {
    id: 10,
    name: "财务",
    emoji: "💰",
    role: "会计 & 审计",
    provider: "minimax",
    description: "管理财务收支，进行成本核算和财务分析，确保资金健康。擅长财务规划和风险控制。",
    skills: ["成本核算", "财务分析", "预算管理", "风险控制"],
    color: "from-emerald-400 to-green-600",
    bgColor: "bg-emerald-500",
  },
  {
    id: 11,
    name: "媒体",
    emoji: "📺",
    role: "媒体 & 宣传",
    provider: "self-claude",
    description: "策划和制作内容，通过多渠道传播提升品牌影响力。擅长内容创意和媒体传播策略。",
    skills: ["内容策划", "视频制作", "媒体传播", "品牌推广"],
    color: "from-sky-400 to-blue-600",
    bgColor: "bg-sky-500",
  },
];

// 按角色分类
const categories = [
  { name: "核心团队", members: [1, 2, 3] },
  { name: "技术团队", members: [4, 5, 6, 7] },
  { name: "运营团队", members: [8, 9, 10, 11] },
];

export default function TeamPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Hero Section */}
      <section className="relative py-24 px-6 bg-gradient-to-br from-zinc-900 via-zinc-800 to-black">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            团队 <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">成员</span>
          </h1>
          <p className="text-xl md:text-2xl text-zinc-300 max-w-2xl mx-auto">
            认识7zi Studio的11位AI专家
          </p>
        </div>
      </section>

      {/* Team Grid */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* All Members Grid */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-8 flex items-center gap-3">
              <span>👥</span>
              全部团队成员
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="group bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer"
                >
                  {/* Avatar */}
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${member.color} flex items-center justify-center text-4xl mb-4 group-hover:scale-110 transition-transform`}>
                    {member.emoji}
                  </div>
                  
                  {/* Info */}
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                    {member.name}
                  </h3>
                  <p className={`text-sm font-medium bg-gradient-to-r ${member.color} bg-clip-text text-transparent mb-2`}>
                    {member.role}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                    提供商: {member.provider}
                  </p>
                  
                  {/* Skills */}
                  <div className="flex flex-wrap gap-2">
                    {member.skills.slice(0, 3).map((skill) => (
                      <span
                        key={skill}
                        className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Categorized View */}
          {categories.map((category) => (
            <div key={category.name} className="mb-16">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-8 flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${
                  category.name === "核心团队" ? "bg-yellow-500" :
                  category.name === "技术团队" ? "bg-green-500" : "bg-purple-500"
                }`}></span>
                {category.name}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {category.members.map((id) => {
                  const member = teamMembers.find(m => m.id === id)!;
                  return (
                    <div
                      key={member.id}
                      className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300"
                    >
                      {/* Header with gradient */}
                      <div className={`h-24 bg-gradient-to-br ${member.color} relative`}>
                        <div className="absolute -bottom-10 left-6">
                          <div className="w-20 h-20 rounded-2xl bg-white dark:bg-zinc-900 flex items-center justify-center text-4xl shadow-lg">
                            {member.emoji}
                          </div>
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="pt-12 pb-6 px-6">
                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">
                          {member.name}
                        </h3>
                        <p className={`text-sm font-medium bg-gradient-to-r ${member.color} bg-clip-text text-transparent mb-3`}>
                          {member.role}
                        </p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                          {member.description}
                        </p>
                        
                        {/* Skills */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {member.skills.map((skill) => (
                            <span
                              key={skill}
                              className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                        
                        {/* Provider */}
                        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                          <span>提供商</span>
                          <span className="font-medium">{member.provider}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6 bg-white dark:bg-zinc-900">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-cyan-600 dark:text-cyan-400 mb-2">11</div>
              <div className="text-zinc-600 dark:text-zinc-400">AI专家</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">4</div>
              <div className="text-zinc-600 dark:text-zinc-400">专业分类</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">3</div>
              <div className="text-zinc-600 dark:text-zinc-400">AI提供商</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">∞</div>
              <div className="text-zinc-600 dark:text-zinc-400">协作可能</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-purple-600 to-pink-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            欢迎加入我们的旅程
          </h2>
          <p className="text-xl text-white/80 mb-8">
            探索AI的无限可能，与7zi Studio一起创造未来
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 bg-white text-purple-600 px-8 py-4 rounded-full font-semibold text-lg hover:bg-purple-50 transition-colors"
            >
              返回首页
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/10 transition-colors"
            >
              了解更多
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
