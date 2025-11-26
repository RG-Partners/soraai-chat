import { cookies, headers } from 'next/headers';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_KEY,
  type SupportedLocaleCode,
  isSupportedLocale,
} from '@/lib/constants/locales';

const extractLocaleFromHeader = (value: string | null): SupportedLocaleCode | null => {
  if (!value) return null;

  const [first] = value.split(',');
  if (!first) return null;

  const language = first.trim().split('-')[0];

  if (isSupportedLocale(language)) {
    return language;
  }

  return null;
};

const extractLocaleFromCookie = async (): Promise<SupportedLocaleCode | null> => {
  const store = await cookies();
  const cookieValue = store.get(LOCALE_COOKIE_KEY)?.value;

  if (isSupportedLocale(cookieValue)) {
    return cookieValue;
  }

  return null;
};

export const getActiveLocale = async (): Promise<SupportedLocaleCode> => {
  const cookieLocale = await extractLocaleFromCookie();
  if (cookieLocale) {
    return cookieLocale;
  }

  const headerStore = await headers();
  const headerLocale = extractLocaleFromHeader(
    headerStore.get('accept-language') ?? headerStore.get('Accept-Language'),
  );

  return headerLocale ?? DEFAULT_LOCALE;
};
