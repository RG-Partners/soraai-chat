'use client';

import { format } from 'date-fns';

import type { SerializableSession } from './types';

const formatDate = (value: string | null) => {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return '—';
  }
  return format(date, 'MMM d, yyyy p');
};

export function UserSessionsCard({ sessions }: { sessions: SerializableSession[] }) {
  return (
    <section className="rounded-2xl border border-light-200/70 bg-white p-6 shadow-sm dark:border-dark-200/70 dark:bg-dark-secondary">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-black dark:text-white">Active sessions</h2>
        <p className="text-sm text-black/60 dark:text-white/60">
          Recent authentication sessions issued for this account.
        </p>
      </header>
      <div className="mt-6 overflow-hidden rounded-xl border border-light-200/60 dark:border-dark-200/60">
        {sessions.length === 0 ? (
          <div className="px-4 py-6 text-sm text-black/60 dark:text-white/60">
            No active sessions.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-light-200 dark:divide-dark-200">
              <thead className="bg-light-100/60 text-left text-xs font-semibold uppercase tracking-wide text-black/60 dark:bg-black/20 dark:text-white/60">
                <tr>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3">User Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-200/60 dark:divide-dark-200/60 text-sm">
                {sessions.map((session) => (
                  <tr key={session.id} className="bg-white odd:bg-light-100/40 dark:bg-dark-secondary dark:odd:bg-dark-200/40">
                    <td className="px-4 py-3 text-black/80 dark:text-white/80">{formatDate(session.createdAt)}</td>
                    <td className="px-4 py-3 text-black/60 dark:text-white/60">{formatDate(session.expiresAt)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-black/70 dark:text-white/70">
                      {session.ipAddress ?? 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-xs text-black/60 dark:text-white/60">
                      {session.userAgent ?? 'Unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default UserSessionsCard;
