export type SupportedLocaleCode = 'en' | 'fr' | 'rw';

export type LocaleOption = {
  code: SupportedLocaleCode;
  label: string;
};

export const SUPPORTED_LOCALES: LocaleOption[] = [
  {
    code: 'en',
    label: 'English',
  },
  {
    code: 'fr',
    label: 'Français',
  },
  {
    code: 'rw',
    label: 'Kinyarwanda',
  },
];

export const DEFAULT_LOCALE: SupportedLocaleCode = 'en';

export const LOCALE_COOKIE_KEY = 'soraai:locale';

export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180 days

export const isSupportedLocale = (
  locale: string | null | undefined,
): locale is SupportedLocaleCode =>
  SUPPORTED_LOCALES.some((option) => option.code === locale);
