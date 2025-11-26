import { z } from 'zod';
import { parseEnvBoolean } from '@/lib/utils/env';

const ProviderBaseSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  disableSignUp: z.boolean().optional(),
});

type ProviderBase = z.infer<typeof ProviderBaseSchema>;

const GoogleProviderSchema = ProviderBaseSchema.extend({
  prompt: z.literal('select_account').optional(),
});
type GoogleProvider = z.infer<typeof GoogleProviderSchema>;

const MicrosoftProviderSchema = ProviderBaseSchema.extend({
  tenantId: z.string().min(1),
  prompt: z.literal('select_account').optional(),
});
type MicrosoftProvider = z.infer<typeof MicrosoftProviderSchema>;

const AuthConfigSchema = z.object({
  emailAndPasswordEnabled: z.boolean(),
  signUpEnabled: z.boolean(),
  socialProviders: z.object({
    github: ProviderBaseSchema.optional(),
    google: GoogleProviderSchema.optional(),
    microsoft: MicrosoftProviderSchema.optional(),
  }),
});

export type AuthConfig = z.infer<typeof AuthConfigSchema>;
export type SocialAuthenticationProvider = keyof AuthConfig['socialProviders'];

type SocialProviders = AuthConfig['socialProviders'];

export const getAuthConfig = (): AuthConfig => {
  const disableEmailSignIn = parseEnvBoolean(process.env.DISABLE_EMAIL_SIGN_IN);
  const disableSignUp = parseEnvBoolean(process.env.DISABLE_SIGN_UP);

  const socialProviders: SocialProviders = {};

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    const githubConfig: ProviderBase = {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      disableSignUp,
    };

    const result = ProviderBaseSchema.safeParse(githubConfig);
    if (result.success) {
      socialProviders.github = result.data;
    }
  }

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const forceAccountSelection = parseEnvBoolean(
      process.env.GOOGLE_FORCE_ACCOUNT_SELECTION,
    );

    const googleConfig: GoogleProvider = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      disableSignUp,
      ...(forceAccountSelection ? { prompt: 'select_account' as const } : {}),
    };

    const result = GoogleProviderSchema.safeParse(googleConfig);
    if (result.success) {
      socialProviders.google = result.data;
    }
  }

  if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
    const forceAccountSelection = parseEnvBoolean(
      process.env.MICROSOFT_FORCE_ACCOUNT_SELECTION,
    );

    const microsoftConfig: MicrosoftProvider = {
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
      disableSignUp,
      ...(forceAccountSelection ? { prompt: 'select_account' as const } : {}),
    };

    const result = MicrosoftProviderSchema.safeParse(microsoftConfig);
    if (result.success) {
      socialProviders.microsoft = result.data;
    }
  }

  const config = {
    emailAndPasswordEnabled: !disableEmailSignIn,
    signUpEnabled: !disableSignUp,
    socialProviders,
  } satisfies AuthConfig;

  return AuthConfigSchema.parse(config);
};
