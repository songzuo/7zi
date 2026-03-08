import { Link } from '@/i18n/routing';

interface FooterSectionProps {
  tNav: (key: string) => string;
  tFooter: (key: string) => string;
}

export function FooterSection({ tNav, tFooter }: FooterSectionProps) {
  return (
    <footer className="py-12 px-6 bg-zinc-900 text-zinc-400" role="contentinfo">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-2xl font-bold text-white">
            7zi<span className="text-cyan-500">Studio</span>
          </div>
          <nav aria-label="Footer navigation">
            <ul className="flex gap-8">
              <li><Link href="/" className="hover:text-white transition-colors">{tNav('home')}</Link></li>
              <li><Link href="/about" className="hover:text-white transition-colors">{tNav('about')}</Link></li>
              <li><Link href="/team" className="hover:text-white transition-colors">{tNav('team')}</Link></li>
              <li><Link href="/blog" className="hover:text-white transition-colors">{tNav('blog')}</Link></li>
            </ul>
          </nav>
          <div className="text-sm">
            {tFooter('copyright')}
          </div>
        </div>
      </div>
    </footer>
  );
}