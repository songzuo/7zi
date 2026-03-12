import { Link } from '@/i18n/routing';

interface ContactCTAProps {
  title: string;
  description: string;
  emailButton: string;
  homeButton: string;
}

export function ContactCTA({ title, description, emailButton, homeButton }: ContactCTAProps) {
  return (
    <section className="py-20 px-6 bg-gradient-to-r from-cyan-600 to-purple-600">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
          {title}
        </h2>
        <p className="text-xl text-white/80 mb-8">{description}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="mailto:business@7zi.studio"
            className="inline-flex items-center justify-center gap-2 bg-white text-cyan-600 px-8 py-4 rounded-full font-semibold text-lg hover:bg-cyan-50 transition-colors"
          >
            {emailButton}
            <span aria-hidden="true">✉️</span>
          </a>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/10 transition-colors"
          >
            {homeButton}
          </Link>
        </div>
      </div>
    </section>
  );
}
