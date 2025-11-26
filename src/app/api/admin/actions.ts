'use server';

import { headers } from 'next/headers';

import { auth, getSession } from '@/lib/auth/server';
import { requireAdminPermission } from '@/lib/auth/permissions';
import { getUser } from '@/lib/user/server';
import {
  DEFAULT_USER_ROLE,
  userRolesInfo,
} from '@/lib/auth/roles';
import {
  UpdateUserBanStatusSchema,
  UpdateUserRoleSchema,
  type UpdateUserBanStatusActionState,
  type UpdateUserRoleActionState,
} from './validations';

export async function updateUserRolesAction(
  _prevState: UpdateUserRoleActionState | undefined,
  formData: FormData,
): Promise<UpdateUserRoleActionState> {
  const parsed = UpdateUserRoleSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Invalid role update request',
    };
  }

  const session = await getSession();

  if (!session?.user) {
    return {
      success: false,
      message: 'User is not authenticated',
    };
  }

  const { userId, role } = parsed.data;

  if (session.user.id === userId) {
    return {
      success: false,
      message: 'You cannot change your own role.',
    };
  }

  try {
    await requireAdminPermission('update user roles');

    const resolvedRole = role ?? DEFAULT_USER_ROLE;
    const requestHeaders = await headers();

    await auth.api.setRole({
      body: { userId, role: resolvedRole },
      headers: requestHeaders,
    });

    await auth.api.revokeUserSessions({
      body: { userId },
      headers: requestHeaders,
    });

    const user = await getUser(userId);

    return {
      success: true,
      message: `Role updated to ${userRolesInfo[resolvedRole].label}.`,
      user,
    };
  } catch (error) {
    console.error('Failed to update user role', error);
    return {
      success: false,
      message: 'Failed to update user role',
    };
  }
}

export async function updateUserBanStatusAction(
  _prevState: UpdateUserBanStatusActionState | undefined,
  formData: FormData,
): Promise<UpdateUserBanStatusActionState> {
  const parsed = UpdateUserBanStatusSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Invalid status update request',
    };
  }

  const session = await getSession();

  if (!session?.user) {
    return {
      success: false,
      message: 'User is not authenticated',
    };
  }

  const { userId, banned, banReason } = parsed.data;

  if (session.user.id === userId) {
    return {
      success: false,
      message: 'You cannot update your own ban status.',
    };
  }

  try {
    await requireAdminPermission('update user status');

    const requestHeaders = await headers();

    if (banned) {
      await auth.api.unbanUser({
        body: { userId },
        headers: requestHeaders,
      });
    } else {
      await auth.api.banUser({
        body: {
          userId,
          banReason: banReason?.trim().length ? banReason : 'Banned by administrator',
        },
        headers: requestHeaders,
      });

      await auth.api.revokeUserSessions({
        body: { userId },
        headers: requestHeaders,
      });
    }

    const user = await getUser(userId);

    return {
      success: true,
      message: banned
        ? 'User has been unbanned.'
        : 'User has been banned successfully.',
      user,
    };
  } catch (error) {
    console.error('Failed to update user ban status', error);
    return {
      success: false,
      message: 'Failed to update user status',
    };
  }
}
