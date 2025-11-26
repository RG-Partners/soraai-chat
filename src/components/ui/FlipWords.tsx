'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMounted } from '@/lib/hooks/useMounted';

type FlipWordsProps = {
  words: string[];
  duration?: number;
  className?: string;
};

const FlipWords = ({ words, duration = 3000, className }: FlipWordsProps) => {
  const [currentWord, setCurrentWord] = useState(words[0] ?? '');
  const [isAnimating, setIsAnimating] = useState(false);
  const mounted = useMounted();

  const startAnimation = useCallback(() => {
    if (words.length === 0) {
      return;
    }

    const index = words.indexOf(currentWord);
    const nextWord = words[(index + 1) % words.length];
    setCurrentWord(nextWord);
    setIsAnimating(true);
  }, [currentWord, words]);

  useEffect(() => {
    if (words.length === 0) {
      setCurrentWord('');
      return;
    }

    setCurrentWord((prev) => (words.includes(prev) ? prev : words[0]));
  }, [words]);

  useEffect(() => {
    if (!isAnimating) {
      const timer = window.setTimeout(startAnimation, duration);
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [isAnimating, duration, startAnimation]);

  if (!mounted || words.length === 0) {
    return null;
  }

  return (
    <AnimatePresence
      onExitComplete={() => {
        setIsAnimating(false);
      }}
    >
      <motion.div
        key={currentWord}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -32, x: 32, filter: 'blur(6px)', scale: 1.8, position: 'absolute' }}
        transition={{ type: 'spring', stiffness: 120, damping: 14 }}
        className={cn('relative inline-block px-2 text-left text-foreground', className)}
      >
        {currentWord.split(' ').map((word, wordIndex) => (
          <motion.span
            key={`${word}-${wordIndex}`}
            initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: wordIndex * 0.02, duration: 0.12 }}
            className="inline-block whitespace-nowrap"
          >
            {word.split('').map((letter, letterIndex) => (
              <motion.span
                key={`${word}-${letter}-${letterIndex}`}
                initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: wordIndex * 0.12 + letterIndex * 0.04, duration: 0.16 }}
                className="inline-block"
              >
                {letter}
              </motion.span>
            ))}
            <span className="inline-block">&nbsp;</span>
          </motion.span>
        ))}
      </motion.div>
    </AnimatePresence>
  );
};

export default FlipWords;
