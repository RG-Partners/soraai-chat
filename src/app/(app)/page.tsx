import ChatWindow from '@/components/ChatWindow';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chat - Sora AI',
  description: 'Chat with Sora AI, the Rwanda tax compliance copilot.',
};

const Home = () => {
  return <ChatWindow />;
};

export default Home;
