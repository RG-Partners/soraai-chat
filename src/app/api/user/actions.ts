'use server';

import { headers } from 'next/headers';

import { auth, getSession } from '@/lib/auth/server';
import { requireAdminPermission } from '@/lib/auth/permissions';
import {
  getUserAccountInfo,
  updateUserImage,
  updateUserProfileDetails,
} from '@/lib/user/server';
import {
  DeleteUserActionState,
  DeleteUserSchema,
  UpdateUserDetailsSchema,
  UpdateUserImageSchema,
  UpdateUserPasswordActionState,
  UpdateUserPasswordError,
  UpdateUserPasswordSchema,
  type UserActionState,
} from './validations';

export type { UserActionState, UpdateUserPasswordActionState } from './validations';

export async function updateUserDetailsAction(
  _prevState: UserActionState | undefined,
  formData: FormData,
): Promise<UserActionState> {
  const parsed = UpdateUserDetailsSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Invalid input',
    };
  }

  const { userId, ...payload } = parsed.data;

  const session = await getSession();
  const currentUserUpdated = !userId || session?.user?.id === userId;

  const result = await updateUserProfileDetails(payload, userId);

  if (!result.success) {
    return {
      success: false,
      message: result.message ?? 'Failed to update profile',
    };
  }

  return {
    success: true,
    message: 'Profile updated successfully',
    user: result.user,
    currentUserUpdated,
  };
}

export async function updateUserImageAction(
  _prevState: UserActionState | undefined,
  formData: FormData,
): Promise<UserActionState> {
  const parsed = UpdateUserImageSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Invalid image',
    };
  }

  try {
    const session = await getSession();
    const currentUserUpdated =
      !parsed.data.userId || session?.user?.id === parsed.data.userId;

    const user = await updateUserImage(parsed.data.image, parsed.data.userId);
    return {
      success: true,
      message: 'Profile photo updated successfully',
      user,
      currentUserUpdated,
    };
  } catch (error) {
    console.error('Failed to update user image', error);
    return {
      success: false,
      message: 'Failed to update profile photo',
    };
  }
}

export async function updateUserPasswordAction(
  _prevState: UpdateUserPasswordActionState | undefined,
  formData: FormData,
): Promise<UpdateUserPasswordActionState> {
  const parsed = UpdateUserPasswordSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Invalid password input',
      errorCode: UpdateUserPasswordError.UNKNOWN,
    };
  }

  const session = await getSession();

  if (!session?.user) {
    return {
      success: false,
      message: 'User is not authenticated',
      errorCode: UpdateUserPasswordError.UNKNOWN,
    };
  }

  const targetUserId = parsed.data.userId ?? session.user.id;
  const isCurrentUser =
    parsed.data.isCurrentUser ?? targetUserId === session.user.id;

  let accountInfo;
  try {
    accountInfo = await getUserAccountInfo(targetUserId);
  } catch (error) {
    console.error('Failed to load account info for password update', error);
    return {
      success: false,
      message: 'Failed to update password',
      errorCode: UpdateUserPasswordError.UNKNOWN,
    };
  }

  const hasPassword = accountInfo.hasPassword;
  const requiresCurrentPassword = isCurrentUser && hasPassword;

  if (requiresCurrentPassword && !parsed.data.currentPassword) {
    return {
      success: false,
      message: 'Current password is required',
      errorCode: UpdateUserPasswordError.PASSWORD_MISMATCH,
    };
  }

  try {
    const requestHeaders = await headers();

    if (requiresCurrentPassword) {
      await auth.api.changePassword({
        body: {
          currentPassword: parsed.data.currentPassword!,
          newPassword: parsed.data.newPassword,
          revokeOtherSessions: true,
        },
        headers: requestHeaders,
        returnHeaders: true,
      });
    } else {
      await auth.api.setUserPassword({
        body: {
          userId: targetUserId,
          newPassword: parsed.data.newPassword,
        },
        headers: requestHeaders,
        returnHeaders: isCurrentUser,
      });

      if (!isCurrentUser) {
        await auth.api.revokeUserSessions({
          body: { userId: targetUserId },
          headers: requestHeaders,
        });
      }
    }

    return {
      success: true,
      message: hasPassword
        ? 'Password updated successfully'
        : 'Password created successfully',
    };
  } catch (error) {
    console.error('Failed to update password', error);
    return {
      success: false,
      message: 'Failed to update password',
      errorCode: UpdateUserPasswordError.UNKNOWN,
    };
  }
}

export async function deleteUserAction(
  _prevState: DeleteUserActionState | undefined,
  formData: FormData,
): Promise<DeleteUserActionState> {
  const parsed = DeleteUserSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Invalid user',
    };
  }

  try {
    await requireAdminPermission('delete users');

    await auth.api.removeUser({
      body: { userId: parsed.data.userId },
      headers: await headers(),
    });

    return {
      success: true,
      message: 'User deleted successfully',
      redirect: '/admin/users',
    };
  } catch (error) {
    console.error('Failed to delete user', error);
    return {
      success: false,
      message: 'Failed to delete user',
    };
  }
}
