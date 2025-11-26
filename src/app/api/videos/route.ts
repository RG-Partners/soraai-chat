import { getSessionFromRequest } from '@/lib/auth/session';
import handleVideoSearch from '@/lib/chains/videoSearchAgent';
import ModelRegistry from '@/lib/models/registry';
import { ModelWithProvider } from '@/lib/models/types';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import logger from '@/lib/logger';

const videoLogger = logger.withDefaults({ tag: 'api:videos' });

interface VideoSearchBody {
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

    const body: VideoSearchBody = await req.json();

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

    const videos = await handleVideoSearch(
      {
        chat_history: chatHistory,
        query: body.query,
      },
      llm,
    );

    return Response.json({ videos }, { status: 200 });
  } catch (err) {
    videoLogger.error('Failed while searching videos.', err);
    return Response.json(
      { message: 'An error occurred while searching videos' },
      { status: 500 },
    );
  }
};
