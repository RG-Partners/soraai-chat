import db from '@/lib/db';
import { usageEvents } from '@/lib/db/schema';
import logger from '@/lib/logger';
import type { UsageEventInput } from './types';

const analyticsLogger = logger.withDefaults({ tag: 'analytics:events' });

const toSafeMetadata = (metadata?: Record<string, unknown> | null) => {
  if (!metadata) {
    return {} as Record<string, unknown>;
  }

  try {
    return JSON.parse(JSON.stringify(metadata)) as Record<string, unknown>;
  } catch (error) {
    analyticsLogger.warn('Failed to serialize analytics metadata. Falling back to empty object.', error);
    return {} as Record<string, unknown>;
  }
};

export const serializeErrorForAnalytics = (error: unknown): Record<string, unknown> => {
  if (!error) {
    return {};
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message.slice(0, 500),
      stack: error.stack ? error.stack.split('\n').slice(0, 5) : undefined,
    };
  }

  if (typeof error === 'string') {
    return { message: error.slice(0, 500) };
  }

  try {
    return JSON.parse(JSON.stringify(error)) as Record<string, unknown>;
  } catch {
    return { message: String(error).slice(0, 500) };
  }
};

export const logUsageEvent = async (input: UsageEventInput) => {
  try {
    await db
      .insert(usageEvents)
      .values({
        eventType: input.eventType,
        userId: input.userId ?? null,
        chatId: input.chatId ?? null,
        focusMode: input.focusMode ?? null,
        providerId: input.providerId ?? null,
        modelKey: input.modelKey ?? null,
        embeddingProviderId: input.embeddingProviderId ?? null,
        embeddingModelKey: input.embeddingModelKey ?? null,
        optimizationMode: input.optimizationMode ?? null,
        responseTimeMs: input.responseTimeMs ?? null,
        messageCount: input.messageCount ?? 0,
        messageChars: input.messageChars ?? 0,
        sourceCount: input.sourceCount ?? 0,
        fileCount: input.fileCount ?? 0,
        isError: Boolean(input.isError),
        metadata: toSafeMetadata(input.metadata),
        createdAt: input.createdAt ?? new Date(),
      })
      .execute();
  } catch (error) {
    analyticsLogger.error('Failed to log usage event.', error);
  }
};

export default logUsageEvent;
