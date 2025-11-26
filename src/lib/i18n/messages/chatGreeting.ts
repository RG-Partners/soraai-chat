import englishMessages from '@/lib/i18n/messages/en.json';
import frenchMessages from '@/lib/i18n/messages/fr.json';
import kinyarwandaMessages from '@/lib/i18n/messages/rw.json';
import {
  DEFAULT_LOCALE,
  type SupportedLocaleCode,
  isSupportedLocale,
} from '@/lib/constants/locales';

type ChatGreetingKey =
  | 'goodMorning'
  | 'goodAfternoon'
  | 'goodEvening'
  | 'niceToSeeYouAgain'
  | 'whatAreYouWorkingOnToday'
  | 'letMeKnowWhenYoureReadyToBegin'
  | 'whatAreYourThoughtsToday'
  | 'whereWouldYouLikeToStart'
  | 'whatAreYouThinking';

type ChatGreetingTemplateMap = Record<ChatGreetingKey, string>;

type ChatGreetingMessagesMap = Record<SupportedLocaleCode, ChatGreetingTemplateMap>;

const chatGreetingMessages: ChatGreetingMessagesMap = {
  en: englishMessages.Chat.Greeting,
  fr: frenchMessages.Chat.Greeting,
  rw: kinyarwandaMessages.Chat.Greeting,
};

const timeOfDayKey = (): Extract<
  ChatGreetingKey,
  'goodMorning' | 'goodAfternoon' | 'goodEvening'
> => {
  const hour = new Date().getHours();

  if (hour < 12) return 'goodMorning';
  if (hour < 18) return 'goodAfternoon';
  return 'goodEvening';
};

const applyName = (template: string, name?: string | null): string => {
  if (!template.includes('{name}')) {
    return template;
  }

  if (!name || !name.trim()) {
    return template
      .replace(/,\s*\{name\}/g, '')
      .replace(/\s*\{name\}/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  const safeName = name.trim();
  return template.replaceAll('{name}', safeName);
};

const getTemplatesForLocale = (locale: SupportedLocaleCode): ChatGreetingTemplateMap => {
  const normalizedLocale = isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
  return chatGreetingMessages[normalizedLocale] ?? chatGreetingMessages[DEFAULT_LOCALE];
};

export const buildChatGreetingPhrases = (
  locale: SupportedLocaleCode,
  name?: string | null,
): string[] => {
  const templates = getTemplatesForLocale(locale);
  const phrases: string[] = [];

  const firstKey = timeOfDayKey();
  const primaryGreeting = templates[firstKey];

  if (primaryGreeting) {
    phrases.push(applyName(primaryGreeting, name));
  }

  const secondaryKeys: ChatGreetingKey[] = [
    'niceToSeeYouAgain',
    'whatAreYouWorkingOnToday',
    'letMeKnowWhenYoureReadyToBegin',
    'whatAreYourThoughtsToday',
    'whereWouldYouLikeToStart',
    'whatAreYouThinking',
  ];

  secondaryKeys.forEach((key) => {
    const value = templates[key];

    if (value) {
      phrases.push(applyName(value, name));
    }
  });

  return phrases.filter((phrase, index) => phrase && phrases.indexOf(phrase) === index);
};
