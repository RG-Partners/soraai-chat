import { z } from 'zod';

import { passwordSchema } from '@/lib/validations/password';
import type { BasicUserWithLastLogin } from '@/lib/user/types';

export const UpdateUserDetailsSchema = z.object({
  userId: z.string().uuid('Invalid user ID').optional(),
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().email('Invalid email').optional(),
  image: z.string().url('Invalid image URL').optional(),
});

export const UpdateUserImageSchema = z.object({
  userId: z.string().uuid('Invalid user ID').optional(),
  image: z.string().url('Invalid image URL'),
});

export const UpdateUserPasswordSchema = z
  .object({
    userId: z.string().uuid('Invalid user ID').optional(),
    isCurrentUser: z
      .union([z.literal('true'), z.literal('false')])
      .transform((value) => value === 'true')
      .optional(),
    currentPassword: z.string().optional(),
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'Passwords do not match',
        path: ['confirmPassword'],
      });
    }
  });

export const DeleteUserSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

export enum UpdateUserPasswordError {
  PASSWORD_MISMATCH = 'PASSWORD_MISMATCH',
  INVALID_ACCOUNT = 'INVALID_ACCOUNT',
  UNKNOWN = 'UNKNOWN',
}

export type UserActionState =
  | {
      success: true;
      message?: string;
      user?: BasicUserWithLastLogin | null;
      currentUserUpdated?: boolean;
    }
  | {
      success: false;
      message: string;
      errorCode?: string;
    };

export type UpdateUserPasswordActionState =
  | {
      success: true;
      message?: string;
    }
  | {
      success: false;
      message: string;
      errorCode?: UpdateUserPasswordError;
    };

export type DeleteUserActionState =
  | {
      success: true;
      message?: string;
      redirect?: string;
    }
  | {
      success: false;
      message: string;
    };
