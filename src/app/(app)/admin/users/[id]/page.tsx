import { notFound, redirect, unauthorized } from 'next/navigation';

import { AdminUserDetail } from '@/components/admin/users/AdminUserDetail';
import { requireAdminSession } from '@/lib/admin/server';
import { buildReturnUrl } from '@/lib/admin/navigation';
import { getUser, getUserAccountInfo, getUserSessions, getUserStats } from '@/lib/user/server';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const resolveParam = async (value?: string | string[]) => {
  if (!value) {
    return undefined;
  }

  return Array.isArray(value) ? value[0] : value;
};

const serializeDate = (value: Date | string | null | undefined) =>
  value instanceof Date ? value.toISOString() : value ?? null;

const serializeSession = (session: Awaited<ReturnType<typeof getUserSessions>>[number]) => ({
  ...session,
  createdAt: serializeDate(session.createdAt),
  updatedAt: serializeDate(session.updatedAt),
  expiresAt: serializeDate(session.expiresAt),
});

export default async function AdminUserDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;

  const session = await requireAdminSession().catch(() => {
    unauthorized();
    return null;
  });

  if (!session) {
    redirect('/');
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const encodedReturnParams = await resolveParam(resolvedSearchParams?.searchPageParams);
  const returnUrl = buildReturnUrl('/admin/users', encodedReturnParams);

  const [user, account, stats, sessions] = await Promise.all([
    getUser(id),
    getUserAccountInfo(id),
    getUserStats(id),
    getUserSessions(id),
  ]);

  if (!user) {
    notFound();
  }

  const serializedUser = {
    ...user,
    createdAt: serializeDate(user.createdAt),
    updatedAt: serializeDate(user.updatedAt),
    lastLogin: serializeDate(user.lastLogin),
    banExpires: serializeDate(user.banExpires),
  };

  return (
    <AdminUserDetail
      initialUser={serializedUser}
      initialAccount={account}
      initialStats={stats}
      initialSessions={sessions.map(serializeSession)}
      currentUserId={session.user.id}
      returnUrl={returnUrl}
    />
  );
}
