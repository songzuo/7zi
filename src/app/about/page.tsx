import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "关于我们 - 7zi Studio",
  description: "了解7zi Studio团队 - 由11位AI代理组成的创新数字工作室",
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

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Hero Section */}
      <section className="relative py-24 px-6 bg-gradient-to-br from-zinc-900 via-zinc-800 to-black dark:from-black dark:via-zinc-900 dark:to-zinc-800">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            关于 <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">7zi Studio</span>
          </h1>
          <p className="text-xl md:text-2xl text-zinc-300 max-w-2xl mx-auto">
            创新数字工作室，由11位AI代理组成的智能团队
          </p>
        </div>
      </section>

      {/* Studio Introduction */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 md:p-12 shadow-xl">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-6">
              7zi Studio 简介
            </h2>
            <div className="space-y-4 text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
              <p>
                <strong className="text-cyan-600 dark:text-cyan-400">7zi Studio</strong> 是一个创新的数字工作室，我们重新定义了团队的概念 —— 
                由11位专业的AI代理组成，各自发挥专长，协同完成各类数字项目。
              </p>
              <p>
                我们的团队结合了人类创意的灵性和AI的高效执行力，从战略规划到产品交付，
                从设计到推广，每一个环节都有专业的AI成员负责。
              </p>
              <p>
                无论是网站开发、品牌设计、SEO优化还是内容营销，7zi Studio都能为您提供
                一站式的数字化解决方案。
              </p>
            </div>
            
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-cyan-50 dark:bg-cyan-900/20 rounded-2xl">
                <div className="text-4xl font-bold text-cyan-600 dark:text-cyan-400">11</div>
                <div className="text-zinc-600 dark:text-zinc-400">AI专家</div>
              </div>
              <div className="text-center p-6 bg-purple-50 dark:bg-purple-900/20 rounded-2xl">
                <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">7×24</div>
                <div className="text-zinc-600 dark:text-zinc-400">持续工作</div>
              </div>
              <div className="text-center p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl">
                <div className="text-4xl font-bold text-green-600 dark:text-green-400">∞</div>
                <div className="text-zinc-600 dark:text-zinc-400">无限可能</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Members */}
      <section className="py-20 px-6 bg-white dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-zinc-900 dark:text-white mb-4">
            我们的团队成员
          </h2>
          <p className="text-center text-zinc-500 dark:text-zinc-400 mb-16 max-w-2xl mx-auto">
            11位各具专长的AI代理，组成一个高效协作的智能团队
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="group relative bg-zinc-50 dark:bg-black rounded-3xl p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                {/* Gradient border effect */}
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${member.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10`} />
                <div className="absolute inset-0 rounded-3xl bg-zinc-50 dark:bg-black group-hover:bg-white dark:group-hover:bg-zinc-900 transition-colors duration-300 -z-10" />
                
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

      {/* Values Section */}
      <section className="py-20 px-6 bg-zinc-50 dark:bg-black">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-zinc-900 dark:text-white mb-12">
            我们的理念
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">高效协作</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                11位AI代理协同工作，优势互补，确保每个项目都能高效推进。
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8">
              <div className="text-4xl mb-4">💡</div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">创新驱动</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                不断探索新技术、新方案，为客户提供最具创新性的解决方案。
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">专注品质</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                严格把控每个环节的质量，确保交付成果超出客户预期。
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">客户至上</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                深入理解客户需求，提供个性化的服务和支持。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-cyan-600 to-purple-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            准备好与我们合作了吗？
          </h2>
          <p className="text-xl text-white/80 mb-8">
            让我们一起打造您的数字项目
          </p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 bg-white text-cyan-600 px-8 py-4 rounded-full font-semibold text-lg hover:bg-cyan-50 transition-colors"
          >
            联系我们
            <span>→</span>
          </a>
        </div>
      </section>
    </div>
  );
}
