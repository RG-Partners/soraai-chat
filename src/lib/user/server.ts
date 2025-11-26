'use server';

import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { auth, getSession } from '@/lib/auth/server';
import { requireUserManagePermissionFor } from '@/lib/auth/permissions';
import { userRepository } from './repository';
import type {
  BasicUserWithLastLogin,
  UserAccountInfo,
  UserSessionInfo,
  UserStats,
} from './types';

type ResolvedUserContext = {
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>;
  userId: string;
  isSelf: boolean;
};

async function resolveUserContext(requestedUserId?: string): Promise<ResolvedUserContext> {
  const session = await getSession();

  if (!session?.user) {
    notFound();
  }

  const currentUserId = session.user.id;
  const resolvedUserId = requestedUserId ?? currentUserId;
  const isSelf = resolvedUserId === currentUserId;

  if (!isSelf && requestedUserId) {
    try {
      await requireUserManagePermissionFor(resolvedUserId);
    } catch (error) {
      console.error('Unauthorized access to user resource', error);
      notFound();
    }
  }

  return {
    session,
    userId: resolvedUserId,
    isSelf,
  };
}

const coerceDate = (value: unknown): Date =>
  value instanceof Date ? value : new Date(typeof value === 'string' ? value : String(value));

type RawAuthSession = {
  id: string;
  createdAt: unknown;
  updatedAt: unknown;
  expiresAt: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function getUser(
  userId?: string,
): Promise<BasicUserWithLastLogin | null> {
  const { userId: resolvedUserId } = await resolveUserContext(userId);
  return userRepository.getUserById(resolvedUserId);
}

export async function getUserAccountInfo(
  userId?: string,
): Promise<UserAccountInfo> {
  const { userId: resolvedUserId } = await resolveUserContext(userId);
  return userRepository.getUserAccountInfo(resolvedUserId);
}

export async function getUserStats(userId?: string): Promise<UserStats> {
  const { userId: resolvedUserId } = await resolveUserContext(userId);
  return userRepository.getUserStats(resolvedUserId);
}

export async function getUserSessions(
  userId?: string,
): Promise<UserSessionInfo[]> {
  const { userId: resolvedUserId } = await resolveUserContext(userId);
  const sessionList = (await auth.api.listSessions({
    params: { userId: resolvedUserId },
    headers: await headers(),
  })) as RawAuthSession[];

  return sessionList.map((session) => ({
    id: session.id,
    createdAt: coerceDate(session.createdAt),
    updatedAt: coerceDate(session.updatedAt),
    expiresAt: coerceDate(session.expiresAt),
    ipAddress: 'ipAddress' in session ? (session.ipAddress ?? null) : null,
    userAgent: 'userAgent' in session ? (session.userAgent ?? null) : null,
  }));
}

export async function updateUserImage(
  image: string,
  userId?: string,
) {
  const { userId: resolvedUserId, isSelf } = await resolveUserContext(userId);

  if (isSelf) {
    const requestHeaders = await headers();
    await auth.api.updateUser({
      body: { image },
      headers: requestHeaders,
      returnHeaders: true,
    });
  } else {
    await userRepository.updateUserDetails({
      userId: resolvedUserId,
      image,
    });
  }

  return userRepository.getUserById(resolvedUserId);
}

export async function updateUserProfileDetails(
  data: { name?: string; email?: string; image?: string },
  targetUserId?: string,
) {
  const { session, userId, isSelf } = await resolveUserContext(targetUserId);
  const { name, email, image } = data;

  try {
    if (isSelf) {
      const requestHeaders = await headers();

      if (name !== undefined || image !== undefined) {
        await auth.api.updateUser({
          body: {
            ...(name !== undefined ? { name } : {}),
            ...(image !== undefined ? { image } : {}),
          },
          headers: requestHeaders,
          returnHeaders: true,
        });
      }

      if (email && email !== session.user.email) {
        await auth.api.changeEmail({
          body: { newEmail: email },
          headers: requestHeaders,
          returnHeaders: true,
        });
      }
    } else {
      await userRepository.updateUserDetails({
        userId,
        name,
        email,
        image,
      });
    }
  } catch (error) {
    console.error('Failed to update user profile', error);
    return {
      success: false,
      message: 'Failed to update profile',
    } as const;
  }

  const refreshedUser = await userRepository.getUserById(userId);

  if (!refreshedUser) {
    return {
      success: false,
      message: 'User was not found after update',
    } as const;
  }

  return {
    success: true,
    user: refreshedUser,
  } as const;
}
