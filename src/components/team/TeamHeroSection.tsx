/**
 * TeamHeroSection - Hero section component for team page
 */

interface TeamHeroSectionProps {
  translations: {
    badge: string
    title: string
    description: string
    stats: {
      members: { value: string; label: string }
      coverage: { value: string; label: string }
      support: { value: string; label: string }
    }
  }
}

export function TeamHeroSection({ translations }: TeamHeroSectionProps) {
  return (
    <section className="bg-gradient-to-br from-cyan-900 via-purple-900 to-zinc-900 px-6 pt-32 pb-16">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-cyan-400 backdrop-blur-sm">
          <span className="animate-pulse">✨</span>
          {translations.badge}
        </div>
        <h1 className="mb-6 text-4xl font-bold text-white md:text-6xl">{translations.title}</h1>
        <p className="mx-auto mb-12 max-w-2xl text-xl text-zinc-300">{translations.description}</p>

        {/* Stats */}
        <div className="mx-auto grid max-w-2xl grid-cols-3 gap-4 sm:gap-8">
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-center backdrop-blur-sm">
            <div className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
              {translations.stats.members.value}
            </div>
            <div className="mt-1 text-sm text-zinc-300">{translations.stats.members.label}</div>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-center backdrop-blur-sm">
            <div className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
              {translations.stats.coverage.value}
            </div>
            <div className="mt-1 text-sm text-zinc-300">{translations.stats.coverage.label}</div>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-center backdrop-blur-sm">
            <div className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
              {translations.stats.support.value}
            </div>
            <div className="mt-1 text-sm text-zinc-300">{translations.stats.support.label}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
