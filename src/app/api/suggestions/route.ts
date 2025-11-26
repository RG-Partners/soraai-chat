import crypto from 'crypto';
import { getSessionFromRequest } from '@/lib/auth/session';
import generateSuggestions from '@/lib/chains/suggestionGeneratorAgent';
import ModelRegistry from '@/lib/models/registry';
import { ModelWithProvider } from '@/lib/models/types';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { CacheKeys, serverCache } from '@/lib/cache';
import { createRateLimiter } from '@/lib/rate-limit';
import logger from '@/lib/logger';

interface SuggestionsGenerationBody {
  chatHistory: any[];
  chatModel: ModelWithProvider;
}

const SUGGESTION_CACHE_TTL_MS = 3 * 60 * 1000;

const suggestionsRateLimiter = createRateLimiter({
  keyPrefix: 'ratelimit:suggestions',
  requests: 10,
  window: '1 m',
  mode: 'sliding',
});

const suggestionsLogger = logger.withDefaults({ tag: 'api:suggestions' });

export const POST = async (req: Request) => {
  try {
    const session = await getSessionFromRequest(req);

    if (!session) {
      return Response.json(
        { message: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body: SuggestionsGenerationBody = await req.json();
    const rawHistory = Array.isArray(body.chatHistory) ? body.chatHistory : [];

    const limiterState = await suggestionsRateLimiter.limit(session.user.id);
    const headers = new Headers();

    if (Number.isFinite(limiterState.limit)) {
      headers.set('X-RateLimit-Limit', limiterState.limit.toString());
      headers.set('X-RateLimit-Remaining', Math.max(limiterState.remaining, 0).toString());
      headers.set('X-RateLimit-Reset', limiterState.reset.toString());
    }

    if (!limiterState.success) {
      const retryAfterSeconds = Math.max(1, Math.ceil(limiterState.retryAfterMs / 1000));
      headers.set('Retry-After', retryAfterSeconds.toString());

      return Response.json(
        { message: 'Too many suggestion requests. Please slow down.' },
        { status: 429, headers },
      );
    }

    const chatHistory = rawHistory
      .map((msg: any) => {
        if (msg.role === 'user') {
          return new HumanMessage(msg.content);
        } else if (msg.role === 'assistant') {
          return new AIMessage(msg.content);
        }
      })
      .filter((msg) => msg !== undefined) as BaseMessage[];

    const registry = new ModelRegistry();

    const llm = await registry.loadChatModel(
      body.chatModel.providerId,
      body.chatModel.key,
    );

    const normalizedHistory = rawHistory
      .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg) => `${msg.role}:${typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}`);

    const fingerprint = crypto
      .createHash('sha1')
      .update(normalizedHistory.join('|') || 'empty')
      .digest('hex');

    const lastMessage = rawHistory.at(-1);
    const chatId = typeof lastMessage?.chatId === 'string' ? lastMessage.chatId : session.user.id;
    const cacheKey = CacheKeys.suggestions(chatId, fingerprint);

    const cachedSuggestions = await serverCache.get<{ suggestions: string[] }>(cacheKey);

    if (cachedSuggestions) {
      headers.set('X-Cache', 'HIT');
      return Response.json(cachedSuggestions, { status: 200, headers });
    }

    const suggestions = await generateSuggestions(
      {
        chat_history: chatHistory,
      },
      llm,
    );

    const payload = { suggestions };

    await serverCache.set(cacheKey, payload, SUGGESTION_CACHE_TTL_MS);

    headers.set('X-Cache', 'MISS');

    return Response.json(payload, { status: 200, headers });
  } catch (err) {
    suggestionsLogger.error('Failed to generate suggestions.', err);
    return Response.json(
      { message: 'An error occurred while generating suggestions' },
      { status: 500 },
    );
  }
};
