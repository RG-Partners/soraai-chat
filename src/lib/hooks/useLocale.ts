'use client';

import { useLocale as useNextIntlLocale } from 'next-intl';
import { DEFAULT_LOCALE, type SupportedLocaleCode } from '@/lib/constants/locales';

export const useLocale = (): SupportedLocaleCode => {
  const locale = useNextIntlLocale();
  if (!locale) {
    return DEFAULT_LOCALE;
  }

  return (locale as SupportedLocaleCode) ?? DEFAULT_LOCALE;
};
