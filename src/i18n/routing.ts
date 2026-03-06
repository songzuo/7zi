import { createNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';
import { locales, defaultLocale, pathnames, localePrefix } from './config';

export const routing = defineRouting({
  locales,
  defaultLocale,
  pathnames,
  localePrefix
});

// 创建导航工具
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
