import db from '@/lib/db';
import { chats } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getSessionFromRequest } from '@/lib/auth/session';
import logger from '@/lib/logger';

const chatsLogger = logger.withDefaults({ tag: 'api:chats' });

export const GET = async (req: Request) => {
  try {
    const session = await getSessionFromRequest(req);

    if (!session) {
      return Response.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userChats = await db.query.chats.findMany({
      where: eq(chats.userId, session.user.id),
      orderBy: desc(chats.createdAt),
    });

    return Response.json({ chats: userChats }, { status: 200 });
  } catch (err) {
    chatsLogger.error('Failed to fetch chats.', err);
    return Response.json(
      { message: 'An error has occurred.' },
      { status: 500 },
    );
  }
};
