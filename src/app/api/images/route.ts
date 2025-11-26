import { getSessionFromRequest } from '@/lib/auth/session';
import handleImageSearch from '@/lib/chains/imageSearchAgent';
import ModelRegistry from '@/lib/models/registry';
import { ModelWithProvider } from '@/lib/models/types';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import logger from '@/lib/logger';

const imageLogger = logger.withDefaults({ tag: 'api:images' });

interface ImageSearchBody {
  query: string;
  chatHistory: any[];
  chatModel: ModelWithProvider;
}

export const POST = async (req: Request) => {
  try {
    const session = await getSessionFromRequest(req);

    if (!session) {
      return Response.json(
        { message: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body: ImageSearchBody = await req.json();

    const chatHistory = body.chatHistory
      .map((msg: any) => {
        if (msg.role === 'user') {
          return new HumanMessage(msg.content);
        } else if (msg.role === 'assistant') {
          return new AIMessage(msg.content);
        }
      })
      .filter((msg) => msg !== undefined) as BaseMessage[];

    const registry = new ModelRegistry();

    const llm = await registry.loadChatModel(
      body.chatModel.providerId,
      body.chatModel.key,
    );

    const images = await handleImageSearch(
      {
        chat_history: chatHistory,
        query: body.query,
      },
      llm,
    );

    return Response.json({ images }, { status: 200 });
  } catch (err) {
    imageLogger.error('Failed while searching images.', err);
    return Response.json(
      { message: 'An error occurred while searching images' },
      { status: 500 },
    );
  }
};
