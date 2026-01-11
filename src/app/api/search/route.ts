import { getSessionFromRequest } from '@/lib/auth/session';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { MetaSearchAgentType } from '@/lib/search/metaSearchAgent';
import { searchHandlers } from '@/lib/search';
import ModelRegistry from '@/lib/models/registry';
import { ModelWithProvider } from '@/lib/models/types';
import logger from '@/lib/logger';
import logUsageEvent, { serializeErrorForAnalytics } from '@/lib/analytics/events';

const searchLogger = logger.withDefaults({ tag: 'api:search' });

interface ChatRequestBody {
  optimizationMode: 'speed' | 'balanced';
  focusMode: string;
  chatModel: ModelWithProvider;
  embeddingModel: ModelWithProvider;
  query: string;
  history: Array<[string, string]>;
  stream?: boolean;
  systemInstructions?: string;
}

export const POST = async (req: Request) => {
  const requestStartTime = Date.now();
  let analyticsErrorLogged = false;
  let sessionUserId: string | null = null;
  const analyticsContext: {
    focusMode?: string;
    providerId?: string;
    modelKey?: string;
    embeddingProviderId?: string;
    embeddingModelKey?: string;
    optimizationMode?: string;
    historyCount?: number;
    stream?: boolean;
  } = {};
  try {
    const session = await getSessionFromRequest(req);

    if (!session) {
      return Response.json(
        { message: 'Unauthorized' },
        { status: 401 },
      );
    }

    sessionUserId = session.user.id;
    const userId = sessionUserId;

    const body: ChatRequestBody = await req.json();

    if (!body.focusMode || !body.query) {
      void logUsageEvent({
        eventType: 'search_error',
        userId,
        focusMode: body.focusMode ?? null,
        providerId: body.chatModel?.providerId,
        modelKey: body.chatModel?.key,
        embeddingProviderId: body.embeddingModel?.providerId,
        embeddingModelKey: body.embeddingModel?.key,
        optimizationMode: body.optimizationMode,
        messageCount: (body.history?.length ?? 0) + 1,
        isError: true,
        metadata: {
          reason: 'missing_focus_or_query',
        },
      });
      analyticsErrorLogged = true;
      return Response.json(
        { message: 'Missing focus mode or query' },
        { status: 400 },
      );
    }

    body.history = body.history || [];
    body.optimizationMode = body.optimizationMode || 'balanced';
    body.stream = body.stream || false;

    analyticsContext.focusMode = body.focusMode;
    analyticsContext.providerId = body.chatModel?.providerId;
    analyticsContext.modelKey = body.chatModel?.key;
    analyticsContext.embeddingProviderId = body.embeddingModel?.providerId;
    analyticsContext.embeddingModelKey = body.embeddingModel?.key;
    analyticsContext.optimizationMode = body.optimizationMode;
    analyticsContext.historyCount = body.history.length;
    analyticsContext.stream = body.stream;

    const history: BaseMessage[] = body.history.map((msg) => {
      return msg[0] === 'human'
        ? new HumanMessage({ content: msg[1] })
        : new AIMessage({ content: msg[1] });
    });

    const registry = new ModelRegistry();

    const [llm, embeddings] = await Promise.all([
      registry.loadChatModel(body.chatModel.providerId, body.chatModel.key),
      registry.loadEmbeddingModel(
        body.embeddingModel.providerId,
        body.embeddingModel.key,
      ),
    ]);

    const searchHandler: MetaSearchAgentType = searchHandlers[body.focusMode];

    if (!searchHandler) {
      void logUsageEvent({
        eventType: 'search_error',
        userId,
        focusMode: body.focusMode,
        providerId: body.chatModel?.providerId,
        modelKey: body.chatModel?.key,
        embeddingProviderId: body.embeddingModel?.providerId,
        embeddingModelKey: body.embeddingModel?.key,
        optimizationMode: body.optimizationMode,
        messageCount: body.history.length + 1,
        isError: true,
        metadata: {
          reason: 'invalid_focus_mode',
        },
      });
      analyticsErrorLogged = true;
      return Response.json({ message: 'Invalid focus mode' }, { status: 400 });
    }

    const emitter = await searchHandler.searchAndAnswer(
      body.query,
      history,
      llm,
      embeddings,
      body.optimizationMode,
      [],
      body.systemInstructions || '',
    );

    const baseMessageCount = (body.history?.length ?? 0) + 1;
    let aggregatedResponseLength = 0;
    let aggregatedSourcesCount = 0;
    let hasResponsePayload = false;

    const recordSearchSuccess = () => {
      if (analyticsErrorLogged) {
        return;
      }

      const responseTimeMs = Date.now() - requestStartTime;
      void logUsageEvent({
        eventType: 'search_response',
        userId,
        focusMode: body.focusMode,
        providerId: body.chatModel?.providerId,
        modelKey: body.chatModel?.key,
        embeddingProviderId: body.embeddingModel?.providerId,
        embeddingModelKey: body.embeddingModel?.key,
        optimizationMode: body.optimizationMode,
        responseTimeMs,
        messageCount: baseMessageCount + (hasResponsePayload ? 1 : 0),
        messageChars: aggregatedResponseLength,
        sourceCount: aggregatedSourcesCount,
        metadata: {
          stream: Boolean(body.stream),
        },
      });
    };

    const recordSearchError = (error: unknown) => {
      if (analyticsErrorLogged) {
        return;
      }
      analyticsErrorLogged = true;
      const responseTimeMs = Date.now() - requestStartTime;
      void logUsageEvent({
        eventType: 'search_error',
        userId,
        focusMode: body.focusMode,
        providerId: body.chatModel?.providerId,
        modelKey: body.chatModel?.key,
        embeddingProviderId: body.embeddingModel?.providerId,
        embeddingModelKey: body.embeddingModel?.key,
        optimizationMode: body.optimizationMode,
        responseTimeMs,
        messageCount: baseMessageCount,
        isError: true,
        metadata: {
          reason: serializeErrorForAnalytics(error),
        },
      });
    };

    emitter.on('data', (chunk: string) => {
      try {
        const parsed = JSON.parse(chunk);
        if (parsed?.type === 'response' && typeof parsed.data === 'string') {
          hasResponsePayload = true;
          aggregatedResponseLength += parsed.data.length;
        } else if (parsed?.type === 'sources' && Array.isArray(parsed.data)) {
          aggregatedSourcesCount += parsed.data.length;
        } else if (parsed?.type === 'error') {
          recordSearchError(parsed.data ?? parsed);
        }
      } catch (error) {
        searchLogger.warn('Failed to parse search emitter payload for analytics.', error);
      }
    });

    emitter.on('error', (error) => {
      recordSearchError(error);
    });

    emitter.on('end', () => {
      recordSearchSuccess();
    });

    if (!body.stream) {
      return new Promise(
        (
          resolve: (value: Response) => void,
          reject: (value: Response) => void,
        ) => {
          let message = '';
          let sources: any[] = [];

          emitter.on('data', (data: string) => {
            try {
              const parsedData = JSON.parse(data);
              if (parsedData.type === 'response') {
                message += parsedData.data;
              } else if (parsedData.type === 'sources') {
                sources = parsedData.data;
              }
            } catch (error) {
              reject(
                Response.json(
                  { message: 'Error parsing data' },
                  { status: 500 },
                ),
              );
            }
          });

          emitter.on('end', () => {
            resolve(Response.json({ message, sources }, { status: 200 }));
          });

          emitter.on('error', (error: any) => {
            reject(
              Response.json(
                { message: 'Search error', error },
                { status: 500 },
              ),
            );
          });
        },
      );
    }

    const encoder = new TextEncoder();

    const abortController = new AbortController();
    const { signal } = abortController;

    const stream = new ReadableStream({
      start(controller) {
        let sources: any[] = [];

        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: 'init',
              data: 'Stream connected',
            }) + '\n',
          ),
        );

        signal.addEventListener('abort', () => {
          emitter.removeAllListeners();

          try {
            controller.close();
          } catch (error) {}
        });

        emitter.on('data', (data: string) => {
          if (signal.aborted) return;

          try {
            const parsedData = JSON.parse(data);

            if (parsedData.type === 'response') {
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: 'response',
                    data: parsedData.data,
                  }) + '\n',
                ),
              );
            } else if (parsedData.type === 'sources') {
              sources = parsedData.data;
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: 'sources',
                    data: sources,
                  }) + '\n',
                ),
              );
            }
          } catch (error) {
            controller.error(error);
          }
        });

        emitter.on('end', () => {
          if (signal.aborted) return;

          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: 'done',
              }) + '\n',
            ),
          );
          controller.close();
        });

        emitter.on('error', (error: any) => {
          if (signal.aborted) return;

          controller.error(error);
        });
      },
      cancel() {
        abortController.abort();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    searchLogger.error('Failed to stream search results.', err);
    if (!analyticsErrorLogged) {
      void logUsageEvent({
        eventType: 'search_error',
        userId: sessionUserId ?? undefined,
        focusMode: analyticsContext.focusMode,
        providerId: analyticsContext.providerId,
        modelKey: analyticsContext.modelKey,
        embeddingProviderId: analyticsContext.embeddingProviderId,
        embeddingModelKey: analyticsContext.embeddingModelKey,
        optimizationMode: analyticsContext.optimizationMode,
        messageCount: (analyticsContext.historyCount ?? 0) + 1,
        isError: true,
        metadata: {
          reason: serializeErrorForAnalytics(err),
        },
      });
      analyticsErrorLogged = true;
    }
    return Response.json(
      { message: 'An error has occurred.' },
      { status: 500 },
    );
  }
};
