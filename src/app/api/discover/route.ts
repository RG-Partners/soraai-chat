import { getSessionFromRequest } from '@/lib/auth/session';
import { searchSearxng } from '@/lib/searxng';
import { CacheKeys, serverCache } from '@/lib/cache';
import { createRateLimiter } from '@/lib/rate-limit';
import logger from '@/lib/logger';

const websitesForTopic = {
  'policy-legislation': {
    query: [
      'IRS guidance update',
      'tax legislation update',
      'treasury tax policy statement',
      'congress tax bill analysis',
    ],
    links: [
      'irs.gov/newsroom',
      'home.treasury.gov/news',
      'taxfoundation.org',
      'reuters.com/legal/government',
    ],
  },
  'corporate-international': {
    query: [
      'corporate tax planning news',
      'OECD pillar two update',
      'transfer pricing dispute',
      'global tax reform analysis',
    ],
    links: [
      'news.bloombergtax.com',
      'tax.thomsonreuters.com/news',
      'oecd.org/tax',
      'kpmg.com',
    ],
  },
  'compliance-enforcement': {
    query: [
      'IRS enforcement action',
      'tax court decision',
      'tax compliance guidance',
      'tax fraud investigation',
    ],
    links: [
      'law360.com/tax-authority',
      'taxnotes.com',
      'justice.gov/tax',
      'irs.gov/compliance',
    ],
  },
  'advisory-strategy': {
    query: [
      'tax strategy insights',
      'M&A tax planning',
      'tax technology transformation',
      'pillar two readiness guidance',
    ],
    links: [
      'deloitte.com',
      'ey.com/en_us/tax',
      'pwc.com/us/en/services/tax.html',
      'bdo.com/insights/tax',
    ],
  },
  'personal-small-business': {
    query: [
      'small business tax deductions',
      'IRS filing guidance',
      'retirement tax planning tips',
      'tax credits for small business',
    ],
    links: [
      'irs.gov/newsroom',
      'tax.thomsonreuters.com/news',
      'forbes.com/taxes',
      'accountingtoday.com/tag/taxes',
    ],
  },
};

type Topic = keyof typeof websitesForTopic;

const DISCOVER_CACHE_TTL_MS = 5 * 60 * 1000;
const DISCOVER_PREVIEW_CACHE_TTL_MS = 60 * 1000;

const discoverRateLimiter = createRateLimiter({
  keyPrefix: 'ratelimit:discover',
  requests: 20,
  window: '5 m',
  mode: 'sliding',
});

const discoverLogger = logger.withDefaults({ tag: 'api:discover' });

export const GET = async (req: Request) => {
  try {
    const session = await getSessionFromRequest(req);

    if (!session) {
      return Response.json(
        { message: 'Unauthorized' },
        { status: 401 },
      );
    }

    const params = new URL(req.url).searchParams;

    const mode: 'normal' | 'preview' =
      (params.get('mode') as 'normal' | 'preview') || 'normal';
    const topic: Topic =
      (params.get('topic') as Topic) || 'policy-legislation';

    const limiterState = await discoverRateLimiter.limit(session.user.id);
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
        { message: 'Too many discover requests. Please try again later.' },
        { status: 429, headers },
      );
    }

    const selectedTopic = websitesForTopic[topic];

    let data = [];

    const cacheKey = CacheKeys.discover(topic, mode);
    const cached = await serverCache.get<{ blogs: unknown[] }>(cacheKey);

    if (cached) {
      headers.set('X-Cache', 'HIT');
      return Response.json(cached, { status: 200, headers });
    }

    if (mode === 'normal') {
      const seenUrls = new Set();

      data = (
        await Promise.all(
          selectedTopic.links.flatMap((link) =>
            selectedTopic.query.map(async (query) => {
              return (
                await searchSearxng(`site:${link} ${query}`, {
                  engines: ['bing news'],
                  pageno: 1,
                  language: 'en',
                })
              ).results;
            }),
          ),
        )
      )
        .flat()
        .filter((item) => {
          const url = item.url?.toLowerCase().trim();
          if (seenUrls.has(url)) return false;
          seenUrls.add(url);
          return true;
        })
        .sort(() => Math.random() - 0.5);
    } else {
      data = (
        await searchSearxng(
          `site:${selectedTopic.links[Math.floor(Math.random() * selectedTopic.links.length)]} ${selectedTopic.query[Math.floor(Math.random() * selectedTopic.query.length)]}`,
          {
            engines: ['bing news'],
            pageno: 1,
            language: 'en',
          },
        )
      ).results;
    }

    const payload = { blogs: data };
    const ttl =
      mode === 'preview' ? DISCOVER_PREVIEW_CACHE_TTL_MS : DISCOVER_CACHE_TTL_MS;

    await serverCache.set(cacheKey, payload, ttl);

    headers.set('X-Cache', 'MISS');

    return Response.json(payload, { status: 200, headers });
  } catch (err) {
    discoverLogger.error('Failed to resolve discover feed.', err);
    return Response.json(
      {
        message: 'An error has occurred',
      },
      {
        status: 500,
      },
    );
  }
};
