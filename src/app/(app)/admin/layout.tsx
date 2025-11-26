import { redirect } from 'next/navigation';

import { requireAdminPermission } from '@/lib/auth/permissions';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdminPermission('access the admin area');
  } catch (error) {
    console.error('Admin access denied', error);
    redirect('/');
  }

  return <div className="flex flex-col gap-8 p-6 lg:p-8">{children}</div>;
}
