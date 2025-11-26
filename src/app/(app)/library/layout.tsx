import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'History - Sora AI',
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  return <div>{children}</div>;
};

export default Layout;
