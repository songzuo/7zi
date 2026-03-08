interface WhyUsSectionProps {
  tWhyUs: (key: string) => string;
}

const WHY_US_ITEMS = [
  { key: 'efficient', icon: '⚡', gradient: 'from-yellow-400 to-orange-500' },
  { key: 'professional', icon: '🎯', gradient: 'from-blue-400 to-cyan-500' },
  { key: 'cost', icon: '💰', gradient: 'from-green-400 to-emerald-500' },
  { key: 'iteration', icon: '🔄', gradient: 'from-purple-400 to-pink-500' },
] as const;

export function WhyUsSection({ tWhyUs }: WhyUsSectionProps) {
  const items = WHY_US_ITEMS.map((config) => ({
    icon: config.icon,
    title: tWhyUs(`${config.key}.title`),
    desc: tWhyUs(`${config.key}.description`),
    gradient: config.gradient,
  }));

  return (
    <section className="py-16 sm:py-20 px-6 bg-white dark:bg-zinc-900" aria-labelledby="why-us-title">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 id="why-us-title" className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            {tWhyUs('title')}
          </h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6" role="list">
          {items.map((item, index) => (
            <div
              key={item.title}
              className="group flex items-start gap-4 p-6 bg-zinc-50 dark:bg-zinc-800 rounded-2xl hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              role="listitem"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-md`} aria-hidden="true">
                {item.icon}
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-white mb-1">{item.title}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}