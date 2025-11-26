import { getSessionFromRequest } from '@/lib/auth/session';
import { isEditorRole } from '@/lib/auth/roles';
import configManager from '@/lib/config';
import { NextRequest } from 'next/server';
import logger from '@/lib/logger';

const configRouteLogger = logger.withDefaults({ tag: 'api:config' });

export const POST = async (req: NextRequest) => {
  try {
    const session = await getSessionFromRequest(req);

    if (!session) {
      return Response.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!isEditorRole(session.user.role)) {
      return Response.json({ message: 'Forbidden' }, { status: 403 });
    }

    configManager.markSetupComplete();

    return Response.json(
      {
        message: 'Setup marked as complete.',
      },
      {
        status: 200,
      },
    );
  } catch (err) {
    if (err instanceof Error) {
      configRouteLogger.error('Failed to mark setup complete.', err);
      return Response.json({ message: err.message }, { status: 400 });
    }

    configRouteLogger.error('Failed to mark setup complete.', err);
    return Response.json({ message: 'An error has occurred.' }, { status: 500 });
  }
};
