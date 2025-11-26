import { and, count, eq, gte, sql } from 'drizzle-orm';

import { pgDb } from '@/lib/db';
import {
  accounts,
  chats,
  messages,
  sessions,
  users,
} from '@/lib/db/schema';
import type {
  BasicUserWithLastLogin,
  UserAccountInfo,
  UserStats,
} from './types';

const selectUserFields = {
  id: users.id,
  email: users.email,
  name: users.name,
  image: users.image,
  role: users.role,
  banned: users.banned,
  banReason: users.banReason,
  banExpires: users.banExpires,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

export const userRepository = {
  async getUserById(userId: string): Promise<BasicUserWithLastLogin | null> {
    const [user] = await pgDb
      .select({
        ...selectUserFields,
        lastLogin: sql<Date | null>`MAX(${sessions.updatedAt})`,
      })
      .from(users)
      .leftJoin(sessions, eq(sessions.userId, users.id))
      .where(eq(users.id, userId))
      .groupBy(
        users.id,
        users.email,
        users.name,
        users.image,
        users.role,
        users.banned,
        users.banReason,
        users.banExpires,
        users.createdAt,
        users.updatedAt,
      );

    if (!user) {
      return null;
    }

    return {
      ...user,
      name: user.name ?? null,
      image: user.image ?? null,
      role: user.role ?? null,
      banned: user.banned ?? null,
      banReason: user.banReason ?? null,
      banExpires: user.banExpires ?? null,
      lastLogin: user.lastLogin ?? null,
    };
  },

  async updateUserDetails({
    userId,
    name,
    email,
    image,
  }: {
    userId: string;
    name?: string;
    email?: string;
    image?: string;
  }) {
    if (!name && !email && !image) {
      return null;
    }

    const [updated] = await pgDb
      .update(users)
      .set({
        ...(name !== undefined ? { name } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(image !== undefined ? { image } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({
        ...selectUserFields,
      });

    if (!updated) {
      return null;
    }

    const [lastLoginRow] = await pgDb
      .select({ lastLogin: sql<Date | null>`MAX(${sessions.updatedAt})` })
      .from(sessions)
      .where(eq(sessions.userId, userId));

    return {
      ...updated,
      name: updated.name ?? null,
      image: updated.image ?? null,
      role: updated.role ?? null,
      banned: updated.banned ?? null,
      banReason: updated.banReason ?? null,
      banExpires: updated.banExpires ?? null,
      lastLogin: lastLoginRow?.lastLogin ?? null,
    } satisfies BasicUserWithLastLogin;
  },

  async getUserAccountInfo(userId: string): Promise<UserAccountInfo> {
    const rows = await pgDb
      .select({ providerId: accounts.providerId })
      .from(accounts)
      .where(eq(accounts.userId, userId));

    const oauthProviders = rows
      .filter((row) => row.providerId !== 'credential')
      .map((row) => row.providerId);

    const hasPassword = rows.some((row) => row.providerId === 'credential');

    return {
      hasPassword,
      oauthProviders,
    };
  },

  async getUserStats(userId: string): Promise<UserStats> {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    since.setHours(0, 0, 0, 0);

    const [aggregates] = await pgDb
      .select({
        chatCount: sql<number>`COUNT(DISTINCT ${chats.id})`.as('chatCount'),
        messageCount: count(messages.id).as('messageCount'),
      })
      .from(chats)
      .leftJoin(messages, eq(messages.chatId, chats.id))
      .where(and(eq(chats.userId, userId), gte(chats.createdAt, since)));

    return {
      chatCount: Number(aggregates?.chatCount ?? 0),
      messageCount: Number(aggregates?.messageCount ?? 0),
      period: 'Last 30 Days',
    };
  },
};
