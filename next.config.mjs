import createNextIntlPlugin from 'next-intl/plugin';

const BUILD_OUTPUT = process.env.NEXT_STANDALONE_OUTPUT ? 'standalone' : undefined;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: BUILD_OUTPUT,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh4.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh5.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh6.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
  serverExternalPackages: ['pdf-parse'],
};

const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');

export default withNextIntl(nextConfig);
