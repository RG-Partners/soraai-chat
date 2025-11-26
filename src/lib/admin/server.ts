import 'server-only';

import { getSession } from '@/lib/auth/server';
import {
  requireAdminPermission,
  requireUserListPermission,
} from '@/lib/auth/permissions';
import { adminRepository } from '@/lib/db/pg/repositories/admin-repository';
import type {
  AdminUsersPaginated,
  AdminUsersQuery,
  AdminUsersSortField,
} from '@/types/admin';

export const ADMIN_USER_LIST_LIMIT = 10;
export const DEFAULT_SORT_BY: AdminUsersSortField = 'createdAt';
export const DEFAULT_SORT_DIRECTION: 'asc' | 'desc' = 'desc';

export async function requireAdminSession() {
  const session = await getSession();

  if (!session) {
    throw new Error('Unauthorized: No active session found');
  }

  await requireAdminPermission('access the admin area');

  return session;
}

export async function getAdminUsers(
  query?: AdminUsersQuery,
): Promise<AdminUsersPaginated> {
  await requireUserListPermission('view admin users');

  return adminRepository.getUsers({
    ...query,
    limit: query?.limit ?? ADMIN_USER_LIST_LIMIT,
    offset: query?.offset ?? 0,
    sortBy: query?.sortBy ?? DEFAULT_SORT_BY,
    sortDirection: query?.sortDirection ?? DEFAULT_SORT_DIRECTION,
  });
}
