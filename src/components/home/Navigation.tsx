import { Link } from '@/i18n/routing';
import { ThemeToggle } from '@/components/ClientProviders';
import MobileMenu from '@/components/MobileMenu';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

interface NavigationProps {
  tNav: (key: string) => string;
}

export function Navigation({ tNav }: NavigationProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white touch-feedback" aria-label="7zi Studio Home">
          7zi<span className="text-cyan-500">Studio</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6">
            <Link href="/about" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">
              {tNav('about')}
            </Link>
            <Link href="/team" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">
              {tNav('team')}
            </Link>
            <Link href="/blog" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">
              {tNav('blog')}
            </Link>
            <a
              href="https://visa.7zi.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors"
            >
              {tNav('global')}
            </a>
            <Link href="/dashboard" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">
              {tNav('dashboard')}
            </Link>
            <ThemeToggle />
            <LanguageSwitcher />
            <Link
              href="/contact"
              className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-full font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all touch-feedback"
            >
              {tNav('contact')}
            </Link>
          </div>
          
          {/* Mobile Navigation */}
          <div className="flex lg:hidden items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <MobileMenu />
          </div>
        </div>
      </div>
    </nav>
  );
}