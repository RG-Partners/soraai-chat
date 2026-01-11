import { NextRequest } from 'next/server';

import { getSessionFromRequest } from '@/lib/auth/session';
import { isAdminRole } from '@/lib/auth/roles';
import analyticsRepository from '@/lib/analytics/repository';
import logger from '@/lib/logger';

const analyticsApiLogger = logger.withDefaults({ tag: 'api:admin:analytics' });

const parseRangeParam = (value: string | null): number | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const GET = async (req: NextRequest) => {
  try {
    const session = await getSessionFromRequest(req);

    if (!session) {
      return Response.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdminRole(session.user.role)) {
      return Response.json({ message: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const rangeParam = parseRangeParam(url.searchParams.get('rangeDays'));

    const data = await analyticsRepository.getDashboardData({ rangeDays: rangeParam });

    return Response.json(data, { status: 200 });
  } catch (error) {
    analyticsApiLogger.error('Failed to load admin analytics dashboard data.', error);
    return Response.json({ message: 'An error has occurred.' }, { status: 500 });
  }
};
