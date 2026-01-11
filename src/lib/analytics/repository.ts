import {
  and,
  count,
  eq,
  gte,
  inArray,
  isNotNull,
  lte,
  sql,
} from 'drizzle-orm';

import db from '@/lib/db';
import {
  chats,
  messages,
  usageEvents,
  users,
} from '@/lib/db/schema';
import logger from '@/lib/logger';
import type {
  AnalyticsDashboardData,
  AnalyticsDailyDatum,
  AnalyticsFocusModeDatum,
  AnalyticsProviderDatum,
  AnalyticsRange,
  AnalyticsSummary,
  AnalyticsTopUserDatum,
} from './types';

const analyticsLogger = logger.withDefaults({ tag: 'analytics:repository' });

const DEFAULT_RANGE_DAYS = 30;
const MIN_RANGE_DAYS = 7;
const MAX_RANGE_DAYS = 180;

const clampRange = (rangeDays?: number) => {
  if (!rangeDays || Number.isNaN(rangeDays)) {
    return DEFAULT_RANGE_DAYS;
  }

  return Math.max(MIN_RANGE_DAYS, Math.min(rangeDays, MAX_RANGE_DAYS));
};

const buildRange = (rangeDays: number): AnalyticsRange => {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date(end);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (rangeDays - 1));

  return {
    start,
    end,
    rangeDays,
  };
};

const toDateKey = (value: Date | string | null): string => {
  if (!value) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toISOString().slice(0, 10);
};

const toIsoTimestamp = (value: Date | string | null): string | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const buildEmptyDailySeries = (range: AnalyticsRange): AnalyticsDailyDatum[] => {
  const series: AnalyticsDailyDatum[] = [];
  const cursor = new Date(range.start);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= range.end) {
    series.push({
      date: cursor.toISOString().slice(0, 10),
      chats: 0,
      messages: 0,
      activeUsers: 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return series;
};

const normalizeDailySeries = (
  range: AnalyticsRange,
  chatRows: Array<{ date: Date | string | null; chats: number; activeUsers: number }>,
  messageRows: Array<{ date: Date | string | null; messages: number }>,
): AnalyticsDailyDatum[] => {
  const baseline = buildEmptyDailySeries(range);
  const dataMap = new Map<string, AnalyticsDailyDatum>(
    baseline.map((entry) => [entry.date, { ...entry }]),
  );

  chatRows.forEach((row) => {
    const key = toDateKey(row.date);
    if (!key) {
      return;
    }

    const existing = dataMap.get(key);
    if (!existing) {
      dataMap.set(key, {
        date: key,
        chats: Number(row.chats ?? 0),
        messages: 0,
        activeUsers: Number(row.activeUsers ?? 0),
      });
      return;
    }

    existing.chats = Number(row.chats ?? 0);
    existing.activeUsers = Number(row.activeUsers ?? 0);
  });

  messageRows.forEach((row) => {
    const key = toDateKey(row.date);
    if (!key) {
      return;
    }

    const existing = dataMap.get(key);
    if (!existing) {
      dataMap.set(key, {
        date: key,
        chats: 0,
        messages: Number(row.messages ?? 0),
        activeUsers: 0,
      });
      return;
    }

    existing.messages = Number(row.messages ?? 0);
  });

  return Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));
};

const toSummary = ({
  totalUsers,
  newUsers,
  activeUsers,
  chats,
  messages,
  avgMessagesPerChat,
  avgResponseTimeMs,
  errorRate,
}: {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  chats: number;
  messages: number;
  avgMessagesPerChat: number;
  avgResponseTimeMs: number | null;
  errorRate: number;
}): AnalyticsSummary => ({
  totalUsers,
  newUsers,
  activeUsers,
  chats,
  messages,
  avgMessagesPerChat,
  avgResponseTimeMs,
  errorRate,
});

export const analyticsRepository = {
  async getDashboardData(params?: { rangeDays?: number }): Promise<AnalyticsDashboardData> {
    const rangeDays = clampRange(params?.rangeDays);
    const range = buildRange(rangeDays);

    const chatsWhere = and(gte(chats.createdAt, range.start), lte(chats.createdAt, range.end));
    const messagesWhere = and(gte(messages.createdAt, range.start), lte(messages.createdAt, range.end));
    const usersWhere = and(gte(users.createdAt, range.start), lte(users.createdAt, range.end));
    const usageWhere = and(gte(usageEvents.createdAt, range.start), lte(usageEvents.createdAt, range.end));

    const [{ value: totalUsers }] = await db.select({ value: count(users.id) }).from(users);
    const [{ value: newUsers }] = await db
      .select({ value: count(users.id) })
      .from(users)
      .where(usersWhere);

    const [{ value: chatsCount }] = await db
      .select({ value: count(chats.id) })
      .from(chats)
      .where(chatsWhere);

    const [{ value: messagesCount }] = await db
      .select({ value: count(messages.id) })
      .from(messages)
      .where(messagesWhere);

    const avgMessagesPerChat = chatsCount ? Number(messagesCount ?? 0) / Number(chatsCount ?? 1) : 0;

    const chatUsersRows = await db
      .select({ userId: chats.userId })
      .from(chats)
      .where(and(chatsWhere, isNotNull(chats.userId)));

    const eventUsersRows = await db
      .select({ userId: usageEvents.userId })
      .from(usageEvents)
      .where(and(usageWhere, isNotNull(usageEvents.userId)));

    const activeUsersSet = new Set<string>();
    chatUsersRows.forEach((row) => {
      if (row.userId) {
        activeUsersSet.add(row.userId);
      }
    });
    eventUsersRows.forEach((row) => {
      if (row.userId) {
        activeUsersSet.add(row.userId);
      }
    });
    const activeUsers = activeUsersSet.size;

    const [{ value: avgResponseTimeValue }] = await db
      .select({ value: sql<number | null>`AVG(${usageEvents.responseTimeMs})` })
      .from(usageEvents)
      .where(
        and(
          usageWhere,
          eq(usageEvents.eventType, 'chat_response'),
          eq(usageEvents.isError, false),
          isNotNull(usageEvents.responseTimeMs),
        ),
      );

    const [{ value: chatEventCount }] = await db
      .select({ value: count(usageEvents.id) })
      .from(usageEvents)
      .where(and(usageWhere, inArray(usageEvents.eventType, ['chat_response', 'chat_error'])));

    const [{ value: chatErrorCount }] = await db
      .select({ value: count(usageEvents.id) })
      .from(usageEvents)
      .where(
        and(
          usageWhere,
          eq(usageEvents.isError, true),
          inArray(usageEvents.eventType, ['chat_response', 'chat_error']),
        ),
      );

    const errorRate = Number(chatEventCount ?? 0)
      ? Number(chatErrorCount ?? 0) / Number(chatEventCount ?? 1)
      : 0;

    const dateTruncChats = sql<Date>`date_trunc('day', ${chats.createdAt})`;
    const chatCountAlias = count(chats.id).as('chat_count');
    const chatRows = await db
      .select({
        date: dateTruncChats,
        chats: chatCountAlias,
        activeUsers: sql<number>`COUNT(DISTINCT ${chats.userId})`,
      })
      .from(chats)
      .where(chatsWhere)
      .groupBy(dateTruncChats)
      .orderBy(dateTruncChats);

    const dateTruncMessages = sql<Date>`date_trunc('day', ${messages.createdAt})`;
    const messageRows = await db
      .select({
        date: dateTruncMessages,
        messages: count(messages.id).as('message_count'),
      })
      .from(messages)
      .where(messagesWhere)
      .groupBy(dateTruncMessages)
      .orderBy(dateTruncMessages);

    const daily = normalizeDailySeries(range, chatRows, messageRows);

    const focusModeRows = await db
      .select({
        focusMode: chats.focusMode,
        chats: count(chats.id).as('chat_count'),
      })
      .from(chats)
      .where(chatsWhere)
      .groupBy(chats.focusMode);

    const providerRowsRaw = await db
      .select({
        providerId: usageEvents.providerId,
        modelKey: usageEvents.modelKey,
        responses: count(usageEvents.id).as('response_count'),
        avgResponseTimeMs: sql<number | null>`AVG(${usageEvents.responseTimeMs})`,
        errorCount: sql<number>`SUM(CASE WHEN ${usageEvents.isError} THEN 1 ELSE 0 END)`,
      })
      .from(usageEvents)
      .where(and(usageWhere, inArray(usageEvents.eventType, ['chat_response', 'chat_error'])))
      .groupBy(usageEvents.providerId, usageEvents.modelKey);

    const topUsersRowsRaw = await db
      .select({
        userId: users.id,
        email: users.email,
        name: users.name,
        chats: chatCountAlias,
        lastActive: sql<Date | null>`MAX(${chats.createdAt})`,
      })
      .from(users)
      .innerJoin(chats, and(eq(chats.userId, users.id), chatsWhere))
      .groupBy(users.id, users.email, users.name)
      .orderBy(sql`COUNT(${chats.id}) DESC`)
      .limit(10);

    const focusModes: AnalyticsFocusModeDatum[] = focusModeRows
      .map((row) => ({
        focusMode: row.focusMode ?? 'unknown',
        chats: Number(row.chats ?? 0),
      }))
      .sort((a, b) => b.chats - a.chats);

    const providers: AnalyticsProviderDatum[] = providerRowsRaw
      .map((row) => {
        const responses = Number(row.responses ?? 0);
        const errorCount = Number(row.errorCount ?? 0);
        const avgResponseTimeMs = row.avgResponseTimeMs != null ? Number(row.avgResponseTimeMs) : null;
        const errorRateForProvider = responses ? errorCount / responses : 0;

        return {
          providerId: row.providerId ?? null,
          modelKey: row.modelKey ?? null,
          responses,
          avgResponseTimeMs,
          errorRate: errorRateForProvider,
        } satisfies AnalyticsProviderDatum;
      })
      .sort((a, b) => b.responses - a.responses);

    const topUsers: AnalyticsTopUserDatum[] = topUsersRowsRaw.map((row) => ({
      userId: row.userId,
      email: row.email,
      name: row.name ?? null,
      chats: Number(row.chats ?? 0),
      lastActive: toIsoTimestamp(row.lastActive),
    }));

    const summary = toSummary({
      totalUsers: Number(totalUsers ?? 0),
      newUsers: Number(newUsers ?? 0),
      activeUsers,
      chats: Number(chatsCount ?? 0),
      messages: Number(messagesCount ?? 0),
      avgMessagesPerChat: Number.isFinite(avgMessagesPerChat) ? Number(avgMessagesPerChat) : 0,
      avgResponseTimeMs: avgResponseTimeValue != null ? Number(avgResponseTimeValue) : null,
      errorRate,
    });

    return {
      range: {
        start: range.start.toISOString(),
        end: range.end.toISOString(),
        rangeDays,
      },
      summary,
      daily,
      focusModes,
      providers,
      topUsers,
    } satisfies AnalyticsDashboardData;
  },
};

export default analyticsRepository;
