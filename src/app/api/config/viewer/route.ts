import configManager from '@/lib/config';
import { getSessionFromRequest } from '@/lib/auth/session';
import logger from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';

const configViewerLogger = logger.withDefaults({ tag: 'api:config-viewer' });

export const GET = async (req: NextRequest) => {
  try {
    const session = await getSessionFromRequest(req);

    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const fields = configManager.getUIConfigSections();
    const values = configManager.getCurrentConfig();

    return NextResponse.json({
      fields: {
        preferences: fields.preferences,
        personalization: fields.personalization,
      },
      values: {
        preferences: values.preferences ?? {},
        personalization: values.personalization ?? {},
      },
    });
  } catch (error) {
    configViewerLogger.error('Failed to fetch viewer config.', error);
    return NextResponse.json(
      { message: 'An error has occurred.' },
      { status: 500 },
    );
  }
};
