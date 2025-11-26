import { redirect } from 'next/navigation';
import SignUpForm from '@/components/auth/SignUpForm';
import { getAuthConfig } from '@/lib/auth/config';
import { getIsFirstUser, getSession } from '@/lib/auth/server';
import type { SocialAuthenticationProvider } from '@/lib/auth/config';

export default async function SignUpPage() {
  const session = await getSession();

  if (session) {
    redirect('/');
  }

  const isFirstUser = await getIsFirstUser();
  const { emailAndPasswordEnabled, signUpEnabled, socialProviders } =
    getAuthConfig();

  if (!signUpEnabled && !isFirstUser) {
    redirect('/sign-in');
  }

  const enabledProviders = (Object.keys(socialProviders) as SocialAuthenticationProvider[]).filter(
    (provider) => Boolean(socialProviders[provider]),
  );

  return (
    <SignUpForm
      emailAndPasswordEnabled={emailAndPasswordEnabled || isFirstUser}
      socialProviders={enabledProviders}
      isFirstUser={isFirstUser}
    />
  );
}
