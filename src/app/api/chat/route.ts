import crypto from 'crypto';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { EventEmitter } from 'stream';
import db from '@/lib/db';
import { messageRepository } from '@/lib/db/pg/repositories/message-repository';
import { chats, messages as messagesSchema } from '@/lib/db/schema';
import { and, eq, gt } from 'drizzle-orm';
import { getFileDetails } from '@/lib/utils/files';
import { searchHandlers } from '@/lib/search';
import { z } from 'zod';
import ModelRegistry from '@/lib/models/registry';
import { ModelWithProvider } from '@/lib/models/types';
import { getSessionFromRequest } from '@/lib/auth/session';
import { getEntitlementForSession } from '@/lib/entitlements';
import logger from '@/lib/logger';
import logUsageEvent, { serializeErrorForAnalytics } from '@/lib/analytics/events';

type ChatRecord = typeof chats.$inferSelect;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const config = {
  regions: ['iad1'],
};

const chatLogger = logger.withDefaults({ tag: 'api:chat' });

const MESSAGE_RATE_LIMIT_WINDOW_HOURS = 24;
const MESSAGE_RATE_LIMIT_ERROR = {
  code: 'guest_limit_reached',
  message:
    'You have reached the free conversation limit for today. Sign in to continue chatting.',
};

const messageSchema = z.object({
  messageId: z.string().min(1, 'Message ID is required'),
  chatId: z.string().min(1, 'Chat ID is required'),
  content: z.string().min(1, 'Message content is required'),
});

const chatModelSchema: z.ZodType<ModelWithProvider> = z.object({
  providerId: z.string({
    errorMap: () => ({
      message: 'Chat model provider id must be provided',
    }),
  }),
  key: z.string({
    errorMap: () => ({
      message: 'Chat model key must be provided',
    }),
  }),
});

const embeddingModelSchema: z.ZodType<ModelWithProvider> = z.object({
  providerId: z.string({
    errorMap: () => ({
      message: 'Embedding model provider id must be provided',
    }),
  }),
  key: z.string({
    errorMap: () => ({
      message: 'Embedding model key must be provided',
    }),
  }),
});

const bodySchema = z.object({
  message: messageSchema,
  optimizationMode: z.enum(['speed', 'balanced', 'quality'], {
    errorMap: () => ({
      message: 'Optimization mode must be one of: speed, balanced, quality',
    }),
  }),
  focusMode: z.string().min(1, 'Focus mode is required'),
  history: z
    .array(
      z.tuple([z.string(), z.string()], {
        errorMap: () => ({
          message: 'History items must be tuples of two strings',
        }),
      }),
    )
    .optional()
    .default([]),
  files: z.array(z.string()).optional().default([]),
  chatModel: chatModelSchema,
  embeddingModel: embeddingModelSchema,
  systemInstructions: z.string().nullable().optional().default(''),
});

type Message = z.infer<typeof messageSchema>;
type Body = z.infer<typeof bodySchema>;

const safeValidateBody = (data: unknown) => {
  const result = bodySchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      error: result.error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    };
  }

  return {
    success: true,
    data: result.data,
  };
};

type StreamEventCallbacks = {
  onComplete?: (payload: {
    messageId: string;
    receivedMessage: string;
    sourcesCount: number;
    hasAssistantResponse: boolean;
  }) => void;
  onError?: (payload: { error: unknown }) => void;
};

const handleEmitterEvents = async (
  stream: EventEmitter,
  writer: WritableStreamDefaultWriter,
  encoder: TextEncoder,
  chatId: string,
  callbacks?: StreamEventCallbacks,
) => {
  let receivedMessage = '';
  const aiMessageId = crypto.randomBytes(7).toString('hex');
  let hasAssistantResponse = false;
  let encounteredError = false;
  let writerClosed = false;
  let sourcesCount = 0;
  let errorReported = false;

  const reportError = (errorPayload: unknown) => {
    if (errorReported) {
      return;
    }
    errorReported = true;
    callbacks?.onError?.({ error: errorPayload });
  };

  const writeEvent = (payload: Record<string, unknown>) => {
    if (writerClosed) {
      return;
    }
    writer.write(encoder.encode(`${JSON.stringify(payload)}\n`));
  };

  const closeWriter = () => {
    if (writerClosed) {
      return;
    }
    writer.close();
    writerClosed = true;
  };

  stream.on('data', (data) => {
    const parsedData = JSON.parse(data);
    if (parsedData.type === 'response') {
      hasAssistantResponse = true;
      writeEvent({
        type: 'message',
        data: parsedData.data,
        messageId: aiMessageId,
      });
      receivedMessage += parsedData.data;
    } else if (parsedData.type === 'sources') {
      writeEvent({
        type: 'sources',
        data: parsedData.data,
        messageId: aiMessageId,
      });

      if (Array.isArray(parsedData.data)) {
        sourcesCount += parsedData.data.length;
      }

      const sourceMessageId = crypto.randomBytes(7).toString('hex');

      db.insert(messagesSchema)
        .values({
          chatId: chatId,
          messageId: sourceMessageId,
          role: 'source',
          sources: parsedData.data,
          createdAt: new Date(),
        })
        .execute();
    } else if (parsedData.type === 'error') {
      encounteredError = true;
      writeEvent({
        type: 'error',
        data: parsedData.data,
      });
      reportError(parsedData.data ?? parsedData);
      closeWriter();
    }
  });
  stream.on('end', () => {
    if (encounteredError) {
      closeWriter();
      return;
    }

    writeEvent({
      type: 'messageEnd',
      messageId: aiMessageId,
    });
    closeWriter();

    if (hasAssistantResponse && receivedMessage.trim().length > 0) {
      db.insert(messagesSchema)
        .values({
          content: receivedMessage,
          chatId: chatId,
          messageId: aiMessageId,
          role: 'assistant',
          createdAt: new Date(),
        })
        .execute();
    }

    callbacks?.onComplete?.({
      messageId: aiMessageId,
      receivedMessage,
      sourcesCount,
      hasAssistantResponse,
    });
  });
  stream.on('error', (data) => {
    encounteredError = true;
    let errorPayload: unknown;
    try {
      const parsedData = JSON.parse(data);
      errorPayload = parsedData.data ?? parsedData;
    } catch (err) {
      errorPayload = data;
    }

    writeEvent({
      type: 'error',
      data: errorPayload,
    });
    closeWriter();
    reportError(errorPayload);
  });
};

const handleHistorySave = async (
  existingChat: ChatRecord | undefined,
  message: Message,
  humanMessageId: string,
  focusMode: string,
  files: string[],
  userId: string,
) => {
  const fileData = files.length
    ? await Promise.all(files.map((fileId) => getFileDetails(fileId)))
    : [];

  if (!existingChat) {
    await db
      .insert(chats)
      .values({
        id: message.chatId,
        title: message.content,
        createdAt: new Date(),
        focusMode: focusMode,
        files: fileData,
        userId,
      })
      .execute();
  } else if (JSON.stringify(existingChat.files ?? []) != JSON.stringify(fileData)) {
    db.update(chats)
      .set({
        files: fileData,
      })
      .where(and(eq(chats.id, message.chatId), eq(chats.userId, userId)));
  }

  const messageExists = await db.query.messages.findFirst({
    where: and(
      eq(messagesSchema.messageId, humanMessageId),
      eq(messagesSchema.chatId, message.chatId),
    ),
  });

  if (!messageExists) {
    await db
      .insert(messagesSchema)
      .values({
        content: message.content,
        chatId: message.chatId,
        messageId: humanMessageId,
        role: 'user',
        createdAt: new Date(),
      })
      .execute();
  } else {
    await db
      .delete(messagesSchema)
      .where(
        and(
          gt(messagesSchema.id, messageExists.id),
          eq(messagesSchema.chatId, message.chatId),
        ),
      )
      .execute();
  }
};

export const POST = async (req: Request) => {
  const requestStartTime = Date.now();
  let sessionUserId: string | null = null;
  let analyticsErrorLogged = false;
  const analyticsContext: {
    chatId?: string;
    focusMode?: string;
    providerId?: string;
    modelKey?: string;
    embeddingProviderId?: string;
    embeddingModelKey?: string;
    optimizationMode?: string;
    fileCount?: number;
    baseMessageCount?: number;
  } = {};
  try {
    const session = await getSessionFromRequest(req);

    if (!session) {
      return Response.json(
        { message: 'Unauthorized' },
        { status: 401 },
      );
    }

    const userId = session.user.id;
    sessionUserId = userId;
    const { entitlement } = getEntitlementForSession(session);

    if (entitlement.maxMessagesPerDay !== null && userId) {
      const since = new Date(
        Date.now() - MESSAGE_RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000,
      );
      const sentMessagesCount = await messageRepository.countUserMessagesSince({
        userId,
        since,
      });

      if (sentMessagesCount >= entitlement.maxMessagesPerDay) {
        void logUsageEvent({
          eventType: 'chat_rate_limited',
          userId,
          isError: true,
          metadata: {
            limit: entitlement.maxMessagesPerDay,
            sentMessages: sentMessagesCount,
          },
        });
        return Response.json(MESSAGE_RATE_LIMIT_ERROR, { status: 429 });
      }
    }

    const reqBody = (await req.json()) as Body;

    const parseBody = safeValidateBody(reqBody);
    if (!parseBody.success) {
      void logUsageEvent({
        eventType: 'chat_error',
        userId,
        isError: true,
        metadata: {
          reason: 'invalid_request_body',
          issues: parseBody.error,
        },
      });
      analyticsErrorLogged = true;
      return Response.json(
        { message: 'Invalid request body', error: parseBody.error },
        { status: 400 },
      );
    }

    const body = parseBody.data as Body;
    const { message } = body;

    analyticsContext.chatId = message.chatId;
    analyticsContext.focusMode = body.focusMode;
    analyticsContext.providerId = body.chatModel.providerId;
    analyticsContext.modelKey = body.chatModel.key;
    analyticsContext.embeddingProviderId = body.embeddingModel.providerId;
    analyticsContext.embeddingModelKey = body.embeddingModel.key;
    analyticsContext.optimizationMode = body.optimizationMode;
    analyticsContext.fileCount = body.files.length;
    analyticsContext.baseMessageCount = body.history.length + 1;

    const existingChat = await db.query.chats.findFirst({
      where: eq(chats.id, message.chatId),
    });

    if (existingChat && existingChat.userId && existingChat.userId !== userId) {
      return Response.json({ message: 'Chat not found' }, { status: 404 });
    }

    if (message.content === '') {
      void logUsageEvent({
        eventType: 'chat_error',
        userId,
        chatId: message.chatId,
        focusMode: body.focusMode,
        providerId: body.chatModel.providerId,
        modelKey: body.chatModel.key,
        embeddingProviderId: body.embeddingModel.providerId,
        embeddingModelKey: body.embeddingModel.key,
        optimizationMode: body.optimizationMode,
        messageCount: analyticsContext.baseMessageCount ?? 0,
        fileCount: body.files.length,
        isError: true,
        metadata: {
          reason: 'empty_message',
        },
      });
      analyticsErrorLogged = true;
      return Response.json(
        {
          message: 'Please provide a message to process',
        },
        { status: 400 },
      );
    }

    const registry = new ModelRegistry();

    chatLogger.debug('Loading models with providers.', {
      chatProviderId: body.chatModel.providerId,
      embeddingProviderId: body.embeddingModel.providerId,
      chatModelKey: body.chatModel.key,
      embeddingModelKey: body.embeddingModel.key,
    });

    const modelLoadStart = Date.now();
    const [llm, embedding] = await Promise.all([
      registry.loadChatModel(body.chatModel.providerId, body.chatModel.key),
      registry.loadEmbeddingModel(
        body.embeddingModel.providerId,
        body.embeddingModel.key,
      ),
    ]);
    chatLogger.info('Models loaded', { durationMs: Date.now() - modelLoadStart });

    const humanMessageId =
      message.messageId ?? crypto.randomBytes(7).toString('hex');

    const history: BaseMessage[] = body.history.map((msg) => {
      if (msg[0] === 'human') {
        return new HumanMessage({
          content: msg[1],
        });
      } else {
        return new AIMessage({
          content: msg[1],
        });
      }
    });

    const handler = searchHandlers[body.focusMode];

    if (!handler) {
      void logUsageEvent({
        eventType: 'chat_error',
        userId,
        chatId: message.chatId,
        focusMode: body.focusMode,
        providerId: body.chatModel.providerId,
        modelKey: body.chatModel.key,
        embeddingProviderId: body.embeddingModel.providerId,
        embeddingModelKey: body.embeddingModel.key,
        optimizationMode: body.optimizationMode,
        messageCount: analyticsContext.baseMessageCount ?? 0,
        fileCount: body.files.length,
        isError: true,
        metadata: {
          reason: 'invalid_focus_mode',
        },
      });
      analyticsErrorLogged = true;
      return Response.json(
        {
          message: 'Invalid focus mode',
        },
        { status: 400 },
      );
    }

    const searchStartTime = Date.now();
    chatLogger.info('Starting search and answer', { 
      focusMode: body.focusMode,
      optimizationMode: body.optimizationMode,
      elapsedMs: Date.now() - requestStartTime 
    });

    const stream = await handler.searchAndAnswer(
      message.content,
      history,
      llm,
      embedding,
      body.optimizationMode,
      body.files,
      body.systemInstructions as string,
    );

    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    const encoder = new TextEncoder();

    const baseMessageCount = analyticsContext.baseMessageCount ?? body.history.length + 1;

    handleEmitterEvents(stream, writer, encoder, message.chatId, {
      onComplete: ({ receivedMessage, sourcesCount, hasAssistantResponse }) => {
        if (analyticsErrorLogged) {
          return;
        }

        const responseTimeMs = Date.now() - requestStartTime;
        void logUsageEvent({
          eventType: 'chat_response',
          userId,
          chatId: message.chatId,
          focusMode: body.focusMode,
          providerId: body.chatModel.providerId,
          modelKey: body.chatModel.key,
          embeddingProviderId: body.embeddingModel.providerId,
          embeddingModelKey: body.embeddingModel.key,
          optimizationMode: body.optimizationMode,
          responseTimeMs,
          messageCount: baseMessageCount + (hasAssistantResponse ? 1 : 0),
          messageChars: receivedMessage.length,
          sourceCount: sourcesCount,
          fileCount: body.files.length,
          metadata: {
            systemInstructionsIncluded: Boolean(body.systemInstructions),
          },
        });
      },
      onError: ({ error }) => {
        analyticsErrorLogged = true;
        const responseTimeMs = Date.now() - requestStartTime;
        void logUsageEvent({
          eventType: 'chat_error',
          userId,
          chatId: message.chatId,
          focusMode: body.focusMode,
          providerId: body.chatModel.providerId,
          modelKey: body.chatModel.key,
          embeddingProviderId: body.embeddingModel.providerId,
          embeddingModelKey: body.embeddingModel.key,
          optimizationMode: body.optimizationMode,
          responseTimeMs,
          messageCount: baseMessageCount,
          fileCount: body.files.length,
          isError: true,
          metadata: {
            reason: serializeErrorForAnalytics(error),
          },
        });
      },
    });
    handleHistorySave(
      existingChat,
      message,
      humanMessageId,
      body.focusMode,
      body.files,
      userId,
    );

    return new Response(responseStream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  } catch (err) {
    chatLogger.error('Failed to process chat request.', err);
    if (!analyticsErrorLogged) {
      void logUsageEvent({
        eventType: 'chat_error',
        userId: sessionUserId ?? undefined,
        chatId: analyticsContext.chatId,
        focusMode: analyticsContext.focusMode,
        providerId: analyticsContext.providerId,
        modelKey: analyticsContext.modelKey,
        embeddingProviderId: analyticsContext.embeddingProviderId,
        embeddingModelKey: analyticsContext.embeddingModelKey,
        optimizationMode: analyticsContext.optimizationMode,
        messageCount: analyticsContext.baseMessageCount ?? 0,
        fileCount: analyticsContext.fileCount ?? 0,
        isError: true,
        metadata: {
          reason: serializeErrorForAnalytics(err),
        },
      });
      analyticsErrorLogged = true;
    }
    return Response.json(
      { message: 'An error occurred while processing chat request' },
      { status: 500 },
    );
  }
};
