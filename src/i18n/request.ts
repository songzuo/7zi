import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, Locale, locales } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  // await locale promise
  let locale = await requestLocale;

  // If undefined, use default
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  // Load messages
  const messages = (await import(`./messages/${locale}.json`)).default;

  return {
    locale,
    messages
  };
});
