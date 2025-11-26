import { Loader2 } from 'lucide-react';
import { GithubIcon } from '@/components/icons/GithubIcon';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { MicrosoftIcon } from '@/components/icons/MicrosoftIcon';
import { cn } from '@/lib/utils';
import type { SocialAuthenticationProvider } from '@/lib/auth/config';
import type { ReactNode } from 'react';

const PROVIDER_ORDER: SocialAuthenticationProvider[] = ['google', 'github', 'microsoft'];

const baseButtonClass =
  'flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70';

const providerConfig: Record<
  SocialAuthenticationProvider,
  {
    label: string;
    className: string;
    icon: ReactNode;
    testId: string;
  }
> = {
  github: {
    label: 'Continue with GitHub',
    className:
      'border-light-200/80 bg-transparent text-black hover:bg-light-200/20 focus-visible:ring-black/20 dark:border-dark-200/60 dark:text-white dark:hover:bg-dark-200/40',
    icon: <GithubIcon className="h-4 w-4 fill-current" />,
    testId: 'github-social-button',
  },
  google: {
    label: 'Continue with Google',
    className:
      'border-light-200/80 bg-transparent text-black hover:bg-light-200/20 focus-visible:ring-black/20 dark:border-dark-200/60 dark:text-white dark:hover:bg-dark-200/40',
    icon: <GoogleIcon className="h-4 w-4 fill-current" />,
    testId: 'google-social-button',
  },
  microsoft: {
    label: 'Continue with Microsoft',
    className:
      'border-light-200/80 bg-transparent text-black hover:bg-light-200/20 focus-visible:ring-black/20 dark:border-dark-200/60 dark:text-white dark:hover:bg-dark-200/40',
    icon: <MicrosoftIcon className="h-4 w-4 fill-current" />,
    testId: 'microsoft-social-button',
  },
};

export interface SocialProvidersProps {
  providers: SocialAuthenticationProvider[];
  onProviderClick: (provider: SocialAuthenticationProvider) => void;
  loadingProvider?: SocialAuthenticationProvider | null;
  className?: string;
}

export function SocialProviders({
  providers,
  onProviderClick,
  loadingProvider = null,
  className,
}: SocialProvidersProps) {
  const sortedProviders = PROVIDER_ORDER.filter((provider) => providers.includes(provider));

  if (sortedProviders.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex w-full flex-col gap-3', className)}>
      {sortedProviders.map((provider) => {
        const config = providerConfig[provider];
        const isLoading = loadingProvider === provider;

        return (
          <button
            key={provider}
            type="button"
            onClick={() => onProviderClick(provider)}
            disabled={Boolean(loadingProvider)}
            className={cn(baseButtonClass, config.className)}
            aria-label={config.label}
            data-testid={config.testId}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Redirecting…</span>
              </>
            ) : (
              <>
                {config.icon}
                <span>{config.label}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
