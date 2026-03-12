interface ContactHeroProps {
  title: string;
  description: string;
}

export function ContactHero({ title, description }: ContactHeroProps) {
  return (
    <section className="relative py-24 px-6 bg-gradient-to-br from-zinc-900 via-zinc-800 to-black pt-24">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
          {title}{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
            7zi Studio
          </span>
        </h1>
        <p className="text-xl md:text-2xl text-zinc-300 max-w-2xl mx-auto">
          {description}
        </p>
      </div>
    </section>
  );
}
