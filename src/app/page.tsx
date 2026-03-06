import { redirect } from 'next/navigation';
import { defaultLocale } from '@/i18n/config';

/**
 * 根页面 - 重定向到默认语言
 * Middleware 会处理语言检测，但这里是 fallback
 */
export default function RootPage() {
  redirect(`/${defaultLocale}`);
}