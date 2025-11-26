import { Metadata } from 'next';

import { AdminUsersTable } from '@/components/admin/AdminUsersTable';
import { getAdminUsers, requireAdminSession } from '@/lib/admin/server';
import type { AdminUsersSortField } from '@/types/admin';

const MAX_PAGE_SIZE = 50;
const DEFAULT_LIMIT = 10;
const DEFAULT_SORT: AdminUsersSortField = 'createdAt';
const DEFAULT_DIRECTION: 'asc' | 'desc' = 'desc';

export const metadata: Metadata = {
  title: 'Admin · Users',
};

interface AdminUsersPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const parseNumberParam = (value?: string | string[]) => {
  if (!value) {
    return undefined;
  }

  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw, 10);

  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseSortField = (value?: string | string[]): AdminUsersSortField => {
  if (!value) {
    return DEFAULT_SORT;
  }

  const raw = Array.isArray(value) ? value[0] : value;
  const allowed: AdminUsersSortField[] = [
    'name',
    'email',
    'role',
    'createdAt',
    'updatedAt',
    'lastLogin',
  ];

  return allowed.includes(raw as AdminUsersSortField)
    ? (raw as AdminUsersSortField)
    : DEFAULT_SORT;
};

const parseSortDirection = (value?: string | string[]): 'asc' | 'desc' => {
  if (!value) {
    return DEFAULT_DIRECTION;
  }

  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'asc' ? 'asc' : raw === 'desc' ? 'desc' : DEFAULT_DIRECTION;
};

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const session = await requireAdminSession();
  const resolvedSearchParams = searchParams
    ? await searchParams
    : undefined;

  const query = resolvedSearchParams?.query;
  const pageParam = parseNumberParam(resolvedSearchParams?.page);
  const limitParam = parseNumberParam(resolvedSearchParams?.limit);

  const sortBy = parseSortField(resolvedSearchParams?.sortBy);
  const sortDirection = parseSortDirection(resolvedSearchParams?.sortDirection);
  const page = Math.max(1, pageParam ?? 1);
  const limit = Math.max(1, Math.min(limitParam ?? DEFAULT_LIMIT, MAX_PAGE_SIZE));
  const offset = (page - 1) * limit;

  const data = await getAdminUsers({
    searchValue: Array.isArray(query) ? query[0] : query,
    limit,
    offset,
    sortBy,
    sortDirection,
  });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-black dark:text-white">Users</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Manage accounts, roles, and access policies for your organization.
        </p>
      </div>
      <AdminUsersTable
        users={data.users}
        total={data.total}
        page={page}
        limit={limit}
        currentUserId={session.user.id}
        query={Array.isArray(query) ? query[0] : query}
        sortBy={sortBy}
        sortDirection={sortDirection}
      />
    </section>
  );
}
