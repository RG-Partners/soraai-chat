'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { auth, getIsFirstUser } from '@/lib/auth/server';
import { getAuthConfig } from '@/lib/auth/config';

const SignUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please provide a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must be shorter than 128 characters'),
});

export interface SignUpActionResult {
  success: boolean;
  message?: string;
}

export const signUpAction = async (
  data: z.infer<typeof SignUpSchema>,
): Promise<SignUpActionResult> => {
  const parsed = SignUpSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Invalid sign up details.',
    };
  }

  const { email, name, password } = parsed.data;
  const config = getAuthConfig();
  const isFirstUser = await getIsFirstUser();

  if (!config.signUpEnabled && !isFirstUser) {
    return {
      success: false,
      message: 'Sign ups are currently disabled. Please contact an administrator.',
    };
  }

  try {
    await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
      headers: await headers(),
    });

    return {
      success: true,
      message: isFirstUser
        ? 'Administrator account created. You are signed in.'
        : 'Account created successfully. You are signed in.',
    };
  } catch (error: any) {
    const message =
      error?.error?.message ||
      error?.message ||
      'Unable to create account at this time.';

    return {
      success: false,
      message,
    };
  }
};
