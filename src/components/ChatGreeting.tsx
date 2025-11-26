'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';
import FlipWords from '@/components/ui/FlipWords';
import { buildChatGreetingPhrases } from '@/lib/i18n/messages/chatGreeting';
import { type SupportedLocaleCode } from '@/lib/constants/locales';

type ChatGreetingProps = {
  locale: SupportedLocaleCode;
  displayName?: string | null;
};

const ChatGreeting = ({ locale, displayName }: ChatGreetingProps) => {
  const phrases = useMemo(() => buildChatGreetingPhrases(locale, displayName), [locale, displayName]);

  if (phrases.length === 0) {
    return null;
  }

  return (
    <motion.div
      key="chat-greeting"
      className="my-4 flex h-20 w-full items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: 0.25 }}
    >
      <div className="flex flex-col items-center rounded-xl p-6 text-center leading-relaxed">
        <h2 className="text-xl font-medium text-black/80 dark:text-white/80 md:text-xl">
          <FlipWords words={phrases} className="text-inherit" />
        </h2>
      </div>
    </motion.div>
  );
};

export default ChatGreeting;
