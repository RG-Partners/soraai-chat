import { redirect } from 'next/navigation';
import SignInForm from '@/components/auth/SignInForm';
import { getAuthConfig } from '@/lib/auth/config';
import { getIsFirstUser, getSession } from '@/lib/auth/server';
import type { SocialAuthenticationProvider } from '@/lib/auth/config';

export default async function SignInPage() {
  const session = await getSession();

  if (session) {
    redirect('/');
  }

  const isFirstUser = await getIsFirstUser();
  const { emailAndPasswordEnabled, signUpEnabled, socialProviders } =
    getAuthConfig();

  const enabledProviders = (Object.keys(socialProviders) as SocialAuthenticationProvider[]).filter(
    (provider) => Boolean(socialProviders[provider]),
  );

  return (
    <SignInForm
      emailAndPasswordEnabled={emailAndPasswordEnabled}
      signUpEnabled={signUpEnabled || isFirstUser}
      socialProviders={enabledProviders}
      isFirstUser={isFirstUser}
    />
  );
}
