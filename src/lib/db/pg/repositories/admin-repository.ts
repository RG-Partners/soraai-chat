import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  or,
  sql,
  type AnyColumn,
  type SQL,
} from 'drizzle-orm';

import { pgDb } from '@/lib/db';
import { sessions, users } from '@/lib/db/schema';
import type {
  AdminUserListItem,
  AdminUsersPaginated,
  AdminUsersQuery,
  AdminUsersSortField,
} from '@/types/admin';

const ORDERABLE_FIELDS: Record<
  Exclude<AdminUsersSortField, 'lastLogin'>,
  AnyColumn
> = {
  name: users.name,
  email: users.email,
  role: users.role,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

const DEFAULT_SORT_FIELD: AdminUsersSortField = 'createdAt';
const DEFAULT_SORT_DIRECTION: 'asc' | 'desc' = 'desc';

const buildWhereClause = (query?: AdminUsersQuery): SQL | undefined => {
  if (!query) {
    return undefined;
  }

  const conditions: SQL[] = [];

  if (query.searchValue?.trim()) {
    const term = `%${query.searchValue.trim()}%`;
    const searchCondition = or(
      ilike(users.name, term),
      ilike(users.email, term),
    ) as SQL<unknown>;
    conditions.push(searchCondition);
  }

  if (query.filterField && query.filterValue !== undefined) {
    switch (query.filterField) {
      case 'role': {
        conditions.push(eq(users.role, String(query.filterValue)));
        break;
      }
      case 'banned': {
        conditions.push(eq(users.banned, Boolean(query.filterValue)));
        break;
      }
      default:
        break;
    }
  }

  if (conditions.length === 0) {
    return undefined;
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return and(...conditions);
};

const resolveOrderBy = (
  sortBy?: AdminUsersSortField,
  direction?: 'asc' | 'desc',
) => {
  const sortDirection = direction ?? DEFAULT_SORT_DIRECTION;

  if (sortBy === 'lastLogin') {
    const lastLoginColumn = sql`(
      SELECT MAX(${sessions.updatedAt})
      FROM ${sessions}
      WHERE ${sessions.userId} = ${users.id}
    )`;

    return sortDirection === 'asc' ? asc(lastLoginColumn) : desc(lastLoginColumn);
  }

  const fieldKey = (sortBy ?? DEFAULT_SORT_FIELD) as Exclude<
    AdminUsersSortField,
    'lastLogin'
  >;
  const column = ORDERABLE_FIELDS[fieldKey] ?? users.createdAt;

  return sortDirection === 'asc' ? asc(column) : desc(column);
};

const mapToAdminUser = (row: any): AdminUserListItem => ({
  id: row.id,
  email: row.email,
  name: row.name ?? null,
  image: row.image ?? null,
  role: row.role ?? null,
  banned: row.banned ?? null,
  banReason: row.banReason ?? null,
  banExpires: row.banExpires ?? null,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  lastLogin: row.lastLogin ?? null,
});

export const adminRepository = {
  async getUsers(query?: AdminUsersQuery): Promise<AdminUsersPaginated> {
    const limit = Math.max(1, Math.min(query?.limit ?? 10, 50));
    const offset = Math.max(0, query?.offset ?? 0);

    const whereClause = buildWhereClause(query);
    const orderByClause = resolveOrderBy(query?.sortBy, query?.sortDirection);

    const usersQuery = pgDb
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        image: users.image,
        role: users.role,
        banned: users.banned,
        banReason: users.banReason,
        banExpires: users.banExpires,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        lastLogin: sql<Date | null>`(
          SELECT MAX(${sessions.updatedAt})
          FROM ${sessions}
          WHERE ${sessions.userId} = ${users.id}
        )`,
      })
      .from(users)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    const rows = whereClause
      ? await usersQuery.where(whereClause)
      : await usersQuery;

    const countQuery = pgDb.select({ value: count() }).from(users);
    const [{ value: total }] = whereClause
      ? await countQuery.where(whereClause)
      : await countQuery;

    return {
      users: rows.map(mapToAdminUser),
      total: Number(total ?? 0),
      limit,
      offset,
    };
  },
};

export default adminRepository;
