import { cn } from '@/lib/utils';

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-light-200/70 dark:bg-dark-200/50',
        className,
      )}
    />
  );
}

export function AdminUsersTableSkeleton() {
  const rows = Array.from({ length: 7 });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Skeleton className="h-10 w-full rounded-full" />
        </div>
        <Skeleton className="h-10 w-24 self-start rounded-full sm:self-auto" />
        <Skeleton className="h-4 w-24" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-light-200/70 bg-white shadow-sm dark:border-dark-200/70 dark:bg-dark-secondary">
        <table className="min-w-full divide-y divide-light-200 dark:divide-dark-200">
          <thead className="bg-light-100/60 dark:bg-black/10">
            <tr>
              <th className="px-4 py-3">
                <Skeleton className="h-4 w-20" />
              </th>
              <th className="px-4 py-3">
                <Skeleton className="h-4 w-16" />
              </th>
              <th className="px-4 py-3">
                <Skeleton className="h-4 w-16" />
              </th>
              <th className="px-4 py-3">
                <Skeleton className="h-4 w-20" />
              </th>
              <th className="px-4 py-3">
                <Skeleton className="h-4 w-4" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-light-200/70 dark:divide-dark-200/60">
            {rows.map((_, index) => (
              <tr key={index} className="bg-white dark:bg-dark-secondary">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-44" />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </td>
                <td className="px-4 py-4">
                  <Skeleton className="h-5 w-14 rounded-full" />
                </td>
                <td className="px-4 py-4">
                  <Skeleton className="h-4 w-20" />
                </td>
                <td className="px-4 py-4">
                  <Skeleton className="h-4 w-4" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-36" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-20 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminUsersTableSkeleton;
