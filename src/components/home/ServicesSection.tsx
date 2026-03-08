interface ServicesSectionProps {
  tServices: {
    raw: (key: string) => string[] | unknown;
  } & ((key: string) => string);
}

const SERVICES_CONFIG = [
  { key: 'web', emoji: '💻', color: 'from-blue-400 to-cyan-500' },
  { key: 'design', emoji: '🎨', color: 'from-pink-400 to-rose-500' },
  { key: 'marketing', emoji: '📈', color: 'from-purple-400 to-violet-500' },
] as const;

export function ServicesSection({ tServices }: ServicesSectionProps) {
  const services = SERVICES_CONFIG.map((config) => ({
    emoji: config.emoji,
    title: tServices(`${config.key}.title`) as string,
    desc: tServices(`${config.key}.description`) as string,
    color: config.color,
    features: tServices.raw(`${config.key}.features`) as string[],
  }));

  return (
    <section className="py-16 sm:py-20 px-6 bg-gradient-to-b from-transparent via-zinc-50/50 to-transparent dark:via-zinc-900/50" aria-labelledby="services-title">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 id="services-title" className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            {tServices('title')}
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            {tServices('description')}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8" role="list">
          {services.map((service, index) => (
            <article
              key={service.title}
              className="group relative bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden"
              role="listitem"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${service.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl`} aria-hidden="true" />
              
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center text-2xl sm:text-3xl mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg`} aria-hidden="true">
                {service.emoji}
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white mb-3">
                {service.title}
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                {service.desc}
              </p>
              <ul className="space-y-2" aria-label="Service features">
                {service.features.map((feature: string) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-500">
                    <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}