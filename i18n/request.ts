import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ requestLocale }) => {
  // Locale is provided by next-intl via middleware or another source
  let locale = await requestLocale;

  // Set default if not found
  if (!locale) locale = 'es';

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
