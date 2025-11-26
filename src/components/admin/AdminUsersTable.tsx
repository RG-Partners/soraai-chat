'use client';

import { format } from 'date-fns';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';

import { buildUserDetailUrl } from '@/lib/admin/navigation';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { UserAvatar } from '@/components/UserAvatar';
import { UserRoleBadges } from '@/components/admin/users/UserRoleBadges';
import { UserStatusBadge } from '@/components/admin/users/UserStatusBadge';
import { UserRoleDialog } from '@/components/admin/users/UserRoleDialog';
import type { AdminUserListItem } from '@/types/admin';

interface AdminUsersTableProps {
  users: AdminUserListItem[];
  total: number;
  page: number;
  limit: number;
  currentUserId?: string;
  query?: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  baseUrl?: string;
}

const DEFAULT_BASE_URL = '/admin/users';

export function AdminUsersTable({
  users,
  total,
  page,
  limit,
  currentUserId,
  query,
  sortBy,
  sortDirection,
  baseUrl = DEFAULT_BASE_URL,
}: AdminUsersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [_, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState(query ?? '');
  const [tableUsers, setTableUsers] = useState(users);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleDialogUser, setRoleDialogUser] = useState<AdminUserListItem | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    setTableUsers(users);
  }, [users]);

  const updateUrl = useMemo(() => {
    return (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');

      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      const nextQuery = params.toString();
      const href = `${baseUrl}${nextQuery ? `?${nextQuery}` : ''}`;

      startTransition(() => {
        router.push(href);
      });
    };
  }, [baseUrl, router, searchParams, startTransition]);

  const debouncedUpdate = useDebounce((value: string) => {
    updateUrl({ query: value || undefined, page: undefined });
  }, 300);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    debouncedUpdate(value.trim());
  };

  const handleSort = (field: string) => {
    const isActive = sortBy === field;
    const nextDirection = isActive && sortDirection === 'asc' ? 'desc' : 'asc';

    updateUrl({
      sortBy: field,
      sortDirection: nextDirection,
      page: undefined,
    });
  };

  const handlePageChange = (nextPage: number) => {
    const pageValue = nextPage > 1 ? String(nextPage) : undefined;
    updateUrl({ page: pageValue });
  };

  const handleRowClick = (userId: string) => {
    startTransition(() => {
      const currentParams = searchParams?.toString() ?? '';
      const url = buildUserDetailUrl(userId, currentParams);
      router.push(url);
    });
  };

  const handleRoleDialogClose = useCallback(() => {
    setRoleDialogOpen(false);
    setRoleDialogUser(null);
  }, []);

  const openRoleDialog = useCallback(
    (user: AdminUserListItem) => {
      if (user.id === currentUserId) {
        return;
      }
      setRoleDialogUser(user);
      setRoleDialogOpen(true);
    },
    [currentUserId],
  );

  const renderSortIndicator = (field: string) => {
    if (sortBy !== field) {
      return <ChevronDown className="h-3 w-3 opacity-40" />;
    }

    return sortDirection === 'asc' ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40 dark:text-white/40" />
          <input
            value={searchTerm}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Search by email or name"
            className="w-full rounded-full border border-light-200/70 bg-white py-2 pl-9 pr-3 text-sm text-black shadow-sm transition placeholder:text-black/40 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-dark-200/70 dark:bg-dark-secondary dark:text-white dark:placeholder:text-white/40 dark:focus:border-sky-500"
          />
        </div>
        {(searchParams?.size ?? 0) > 0 && (
          <button
            type="button"
            onClick={() => updateUrl({ query: undefined, page: undefined, sortBy: undefined, sortDirection: undefined })}
            className="inline-flex items-center justify-center rounded-full border border-light-200/70 bg-white px-4 py-2 text-sm font-medium text-black shadow-sm transition hover:bg-light-200/60 dark:border-dark-200/70 dark:bg-dark-secondary dark:text-white dark:hover:bg-dark-200/60"
          >
            Clear filters
          </button>
        )}
        <div className="text-sm text-black/60 dark:text-white/60">
          {total.toLocaleString()} user{total === 1 ? '' : 's'}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-light-200/70 bg-white shadow-sm dark:border-dark-200/70 dark:bg-dark-secondary">
        <table className="min-w-full divide-y divide-light-200 dark:divide-dark-200">
          <thead className="bg-light-100/60 dark:bg-black/20">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-black/60 dark:text-white/60"
              >
                <button
                  type="button"
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 text-sm font-semibold text-black dark:text-white"
                >
                  User
                  {renderSortIndicator('name')}
                </button>
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-black/60 dark:text-white/60"
              >
                <button
                  type="button"
                  onClick={() => handleSort('role')}
                  className="flex items-center gap-1 text-sm font-semibold text-black dark:text-white"
                >
                  Role
                  {renderSortIndicator('role')}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
                Status
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-black/60 dark:text-white/60"
              >
                <button
                  type="button"
                  onClick={() => handleSort('createdAt')}
                  className="flex items-center gap-1 text-sm font-semibold text-black dark:text-white"
                >
                  Joined
                  {renderSortIndicator('createdAt')}
                </button>
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-light-200/70 dark:divide-dark-200/60">
            {tableUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-black/60 dark:text-white/60"
                >
                  No users found.
                </td>
              </tr>
            ) : (
              tableUsers.map((user) => {
                const createdAt = new Date(user.createdAt);
                const isCurrent = currentUserId === user.id;

                return (
                  <tr
                    key={user.id}
                    onClick={() => handleRowClick(user.id)}
                    className="cursor-pointer transition hover:bg-light-100/70 dark:hover:bg-dark-200/40"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={user.name}
                          email={user.email}
                          image={user.image}
                          size="lg"
                        />
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-black dark:text-white">
                            {user.name || user.email}
                            {isCurrent && (
                              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-black/50 dark:text-white/50">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div
                        onClick={(event) => event.stopPropagation()}
                        className="max-w-[240px]"
                      >
                        <UserRoleBadges
                          role={user.role}
                          interactive={!isCurrent}
                          disabled={isCurrent}
                          onClick={!isCurrent ? () => openRoleDialog(user) : undefined}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div onClick={(event) => event.stopPropagation()}>
                        <UserStatusBadge banned={user.banned} banReason={user.banReason} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-black/60 dark:text-white/60">
                      {Number.isNaN(createdAt.valueOf())
                        ? '—'
                        : format(createdAt, 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-black/40 dark:text-white/40">
                      View
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="text-xs text-black/50 dark:text-white/50">
          Page {page} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="rounded-full border border-light-200/70 bg-white px-3 py-1 text-sm font-medium text-black transition hover:bg-light-200/60 disabled:cursor-not-allowed disabled:opacity-40 dark:border-dark-200/70 dark:bg-dark-secondary dark:text-white dark:hover:bg-dark-200/60"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            className="rounded-full border border-light-200/70 bg-white px-3 py-1 text-sm font-medium text-black transition hover:bg-light-200/60 disabled:cursor-not-allowed disabled:opacity-40 dark:border-dark-200/70 dark:bg-dark-secondary dark:text-white dark:hover:bg-dark-200/60"
          >
            Next
          </button>
        </div>
      </div>
      {roleDialogUser && (
        <UserRoleDialog
          open={roleDialogOpen}
          onClose={handleRoleDialogClose}
          userId={roleDialogUser.id}
          currentRole={roleDialogUser.role}
          disabled={roleDialogUser.id === currentUserId}
          onRoleUpdated={(updatedUser) => {
            setTableUsers((prev) =>
              prev.map((entry) => (entry.id === updatedUser.id ? { ...entry, ...updatedUser } : entry)),
            );
          }}
        />
      )}
    </div>
  );
}

export default AdminUsersTable;
