import { z } from 'zod';

import { USER_ROLES, type UserRole } from '@/lib/auth/roles';
import type { UserActionState } from '@/app/api/user/validations';

const ROLE_VALUES = Object.values(USER_ROLES) as [UserRole, ...UserRole[]];

export const UpdateUserRoleSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: z.enum(ROLE_VALUES).optional(),
});

export const UpdateUserBanStatusSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  banned: z
    .union([z.literal('true'), z.literal('false')])
    .transform((value) => value === 'true'),
  banReason: z.string().max(200).optional(),
});

export type UpdateUserRoleActionState = UserActionState;
export type UpdateUserBanStatusActionState = UserActionState;
