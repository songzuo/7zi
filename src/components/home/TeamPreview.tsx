import { Link } from '@/i18n/routing';

interface TeamPreviewProps {
  tTeamPreview: (key: string) => string;
}

const TEAM_MEMBERS = [
  { emoji: '🌟', name: 'AI Expert', color: 'from-yellow-400 to-orange-500' },
  { emoji: '📚', name: 'Consultant', color: 'from-blue-400 to-cyan-500' },
  { emoji: '🏗️', name: 'Architect', color: 'from-purple-400 to-pink-500' },
  { emoji: '⚡', name: 'Executor', color: 'from-green-400 to-emerald-500' },
  { emoji: '🛡️', name: 'Admin', color: 'from-red-400 to-rose-500' },
  { emoji: '🧪', name: 'Tester', color: 'from-indigo-400 to-violet-500' },
  { emoji: '🎨', name: 'Designer', color: 'from-pink-400 to-rose-500' },
  { emoji: '📣', name: 'Marketing', color: 'from-orange-400 to-amber-500' },
  { emoji: '💼', name: 'Sales', color: 'from-teal-400 to-cyan-500' },
  { emoji: '💰', name: 'Finance', color: 'from-emerald-400 to-green-500' },
  { emoji: '📺', name: 'Media', color: 'from-blue-400 to-indigo-500' },
];

export function TeamPreview({ tTeamPreview }: TeamPreviewProps) {
  return (
    <section className="py-16 sm:py-20 px-6 bg-white dark:bg-zinc-900 overflow-hidden" aria-labelledby="team-preview-title">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 id="team-preview-title" className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            {tTeamPreview('title')}
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            {tTeamPreview('description')}
          </p>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4" role="list">
          {TEAM_MEMBERS.map((member, index) => (
            <div
              key={member.name}
              className="group flex flex-col items-center gap-3 p-4 sm:p-6 bg-zinc-50 dark:bg-zinc-800 rounded-2xl hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
              role="listitem"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${member.color} flex items-center justify-center text-3xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg`} aria-hidden="true">
                <span className="group-hover:animate-bounce block">{member.emoji}</span>
              </div>
              <span className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 text-center">{member.name}</span>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-8">
          <Link
            href="/team"
            className="inline-flex items-center gap-2 text-cyan-500 font-medium hover:gap-3 transition-all group"
          >
            {tTeamPreview('viewTeam')}
            <span className="group-hover:translate-x-1 transition-transform" aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}