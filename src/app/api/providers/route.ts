import ModelRegistry from '@/lib/models/registry';
import { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { isEditorRole } from '@/lib/auth/roles';
import logger from '@/lib/logger';

const providersLogger = logger.withDefaults({ tag: 'api:providers' });

export const GET = async (req: Request) => {
  try {
    const session = await getSessionFromRequest(req);

    if (!session) {
      return Response.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const registry = new ModelRegistry();

    const activeProviders = await registry.getActiveProviders();

    const filteredProviders = activeProviders.filter((p) => {
      return !p.chatModels.some((m) => m.key === 'error');
    });

    return Response.json(
      {
        providers: filteredProviders,
      },
      {
        status: 200,
      },
    );
  } catch (err) {
    providersLogger.error('Failed to fetch providers.', err);
    return Response.json(
      {
        message: 'An error has occurred.',
      },
      {
        status: 500,
      },
    );
  }
};

export const POST = async (req: NextRequest) => {
  try {
    const session = await getSessionFromRequest(req);

    if (!session) {
      return Response.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!isEditorRole(session.user.role)) {
      return Response.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { type, name, config } = body;

    if (!type || !name || !config) {
      return Response.json(
        {
          message: 'Missing required fields.',
        },
        {
          status: 400,
        },
      );
    }

    const registry = new ModelRegistry();

    const newProvider = await registry.addProvider(type, name, config);

    return Response.json(
      {
        provider: newProvider,
      },
      {
        status: 200,
      },
    );
  } catch (err) {
    providersLogger.error('Failed to create provider.', err);
    return Response.json(
      {
        message: 'An error has occurred.',
      },
      {
        status: 500,
      },
    );
  }
};
