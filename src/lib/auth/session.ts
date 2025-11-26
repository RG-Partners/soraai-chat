import type { NextRequest } from 'next/server';
import logger from '@/lib/logger';
import { auth, type AuthSession } from './server';

const sessionLogger = logger.withDefaults({ tag: 'auth:session' });

export const getSessionFromRequest = async (
  request: Request | NextRequest,
): Promise<AuthSession> => {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    return session as AuthSession;
  } catch (error) {
    sessionLogger.error('Failed to resolve session from request.', error);
    return null;
  }
};
