import deepmerge from 'deepmerge';
import type { AbstractIntlMessages } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import {
  DEFAULT_LOCALE,
  type SupportedLocaleCode,
} from '@/lib/constants/locales';
import { getActiveLocale } from '@/lib/i18n/server';

let cachedDefaultMessages: AbstractIntlMessages | null = null;

const loadMessages = async (locale: SupportedLocaleCode) => {
  const messagesModule = await import(`./messages/${locale}.json`);
  return messagesModule.default as AbstractIntlMessages;
};

export default getRequestConfig(async () => {
  const locale = await getActiveLocale();

  if (!cachedDefaultMessages) {
    cachedDefaultMessages = await loadMessages(DEFAULT_LOCALE);
  }

  let messages = cachedDefaultMessages;

  if (locale !== DEFAULT_LOCALE) {
    try {
      const localized = await loadMessages(locale);
      messages = deepmerge(cachedDefaultMessages ?? {}, localized) as AbstractIntlMessages;
    } catch (error) {
      console.warn(`Failed to load locale messages for "${locale}":`, error);
      messages = cachedDefaultMessages;
    }
  }

  return {
    locale,
    messages,
    getMessageFallback: ({ key, namespace }) => (namespace ? `${namespace}.${key}` : key),
  };
});
