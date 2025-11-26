import type { BasicUserWithLastLogin } from '@/lib/user/types';

export type AdminUsersSortField =
  | 'name'
  | 'email'
  | 'role'
  | 'createdAt'
  | 'updatedAt'
  | 'lastLogin';

export interface AdminUsersQuery {
  searchValue?: string;
  searchField?: 'name' | 'email';
  searchOperator?: 'contains' | 'starts_with' | 'ends_with';
  limit?: number;
  offset?: number;
  sortBy?: AdminUsersSortField;
  sortDirection?: 'asc' | 'desc';
  filterField?: 'role' | 'banned';
  filterValue?: string | number | boolean;
  filterOperator?: 'lt' | 'eq' | 'ne' | 'lte' | 'gt' | 'gte' | 'contains';
}

export type AdminUserListItem = BasicUserWithLastLogin;

export interface AdminUsersPaginated {
  users: AdminUserListItem[];
  total: number;
  limit: number;
  offset: number;
}
