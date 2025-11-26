import ModelRegistry from '@/lib/models/registry';
import { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { isEditorRole } from '@/lib/auth/roles';
import logger from '@/lib/logger';

const providerLogger = logger.withDefaults({ tag: 'api:providers' });

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

    if (!id) {
      return Response.json(
        {
          message: 'Provider ID is required.',
        },
        {
          status: 400,
        },
      );
    }

    const registry = new ModelRegistry();
    await registry.removeProvider(id);

    return Response.json(
      {
        message: 'Provider deleted successfully.',
      },
      {
        status: 200,
      },
    );
  } catch (err: any) {
    providerLogger.error('Failed to delete provider.', err);
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

export const PATCH = async (
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

    const body = await req.json();
    const { name, config } = body;
    const { id } = await params;

    if (!id || !name || !config) {
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

    const updatedProvider = await registry.updateProvider(id, name, config);

    return Response.json(
      {
        provider: updatedProvider,
      },
      {
        status: 200,
      },
    );
  } catch (err: any) {
    providerLogger.error('Failed to update provider.', err);
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
