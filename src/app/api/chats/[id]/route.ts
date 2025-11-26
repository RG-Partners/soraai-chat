import db from '@/lib/db';
import { chats, messages } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { getSessionFromRequest } from '@/lib/auth/session';
import logger from '@/lib/logger';

const chatsLogger = logger.withDefaults({ tag: 'api:chats' });

export const GET = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const session = await getSessionFromRequest(req);

    if (!session) {
      return Response.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const chatExists = await db.query.chats.findFirst({
      where: and(eq(chats.id, id), eq(chats.userId, session.user.id)),
    });

    if (!chatExists) {
      return Response.json({ message: 'Chat not found' }, { status: 404 });
    }

    const chatMessages = await db.query.messages.findMany({
      where: eq(messages.chatId, id),
    });

    return Response.json(
      {
        chat: chatExists,
        messages: chatMessages,
      },
      { status: 200 },
    );
  } catch (err) {
    chatsLogger.error('Failed to fetch chat by id.', err);
    return Response.json(
      { message: 'An error has occurred.' },
      { status: 500 },
    );
  }
};

export const DELETE = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const session = await getSessionFromRequest(req);

    if (!session) {
      return Response.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const chatExists = await db.query.chats.findFirst({
      where: and(eq(chats.id, id), eq(chats.userId, session.user.id)),
    });

    if (!chatExists) {
      return Response.json({ message: 'Chat not found' }, { status: 404 });
    }

    await db
      .delete(chats)
      .where(and(eq(chats.id, id), eq(chats.userId, session.user.id)))
      .execute();
    await db.delete(messages).where(eq(messages.chatId, id)).execute();

    return Response.json(
      { message: 'Chat deleted successfully' },
      { status: 200 },
    );
  } catch (err) {
    chatsLogger.error('Failed to delete chat by id.', err);
    return Response.json(
      { message: 'An error has occurred.' },
      { status: 500 },
    );
  }
};
