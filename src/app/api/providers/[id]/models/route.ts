import { getSessionFromRequest } from '@/lib/auth/session';
import { isEditorRole } from '@/lib/auth/roles';
import ModelRegistry from '@/lib/models/registry';
import { Model } from '@/lib/models/types';
import { NextRequest } from 'next/server';
import logger from '@/lib/logger';

const providerLogger = logger.withDefaults({ tag: 'api:providers' });

export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const session = await getSessionFromRequest(req);

    if (!session) {
      return Response.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!isEditorRole(session.user.role)) {
      return Response.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const body: Partial<Model> & { type: 'embedding' | 'chat' } =
      await req.json();

    if (!body.key || !body.name) {
      return Response.json(
        {
          message: 'Key and name must be provided',
        },
        {
          status: 400,
        },
      );
    }

    const registry = new ModelRegistry();

    await registry.addProviderModel(id, body.type, body);

    return Response.json(
      {
        message: 'Model added successfully',
      },
      {
        status: 200,
      },
    );
  } catch (err) {
    providerLogger.error('Failed to add provider model.', err);
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

export const DELETE = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const session = await getSessionFromRequest(req);

    if (!session) {
      return Response.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!isEditorRole(session.user.role)) {
      return Response.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const body: { key: string; type: 'embedding' | 'chat' } = await req.json();

    if (!body.key) {
      return Response.json(
        {
          message: 'Key and name must be provided',
        },
        {
          status: 400,
        },
      );
    }

    const registry = new ModelRegistry();

    await registry.removeProviderModel(id, body.type, body.key);

    return Response.json({ message: 'Model deleted successfully' }, { status: 200 });
  } catch (err) {
    providerLogger.error('Failed to delete provider model.', err);
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
