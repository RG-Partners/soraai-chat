export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import ThemeProvider from '@/components/theme/Provider';
import { Toaster } from 'sonner';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

const montserrat = Montserrat({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  fallback: ['Arial', 'sans-serif'],
});

export const metadata: Metadata = {
  title: 'Sora AI - Rwanda Tax Copilot',
  description:
    'Sora AI combines trusted advisors with automation to simplify Rwanda tax compliance.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  return (
    <html className="h-full" lang={locale} suppressHydrationWarning>
      <body className={cn('h-full', montserrat.className)}>
        <ThemeProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
            <Toaster
              toastOptions={{
                unstyled: true,
                classNames: {
                  toast:
                    'bg-light-secondary dark:bg-dark-secondary dark:text-white/70 text-black-70 rounded-lg p-4 flex flex-row items-center space-x-2',
                },
              }}
            />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
