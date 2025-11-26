'use client';

import { format } from 'date-fns';

import type { NormalizedUserStats } from './types';

interface UserStatsCardProps {
  stats: NormalizedUserStats;
}

const formatDate = (value: Date | null) => {
  if (!value) {
    return '—';
  }
  return format(value, 'MMM d, yyyy p');
};

export function UserStatsCard({ stats }: UserStatsCardProps) {
  const averageMessages = stats.chatCount > 0 ? Math.round(stats.messageCount / stats.chatCount) : 0;

  return (
    <section className="rounded-2xl border border-light-200/70 bg-white p-6 shadow-sm dark:border-dark-200/70 dark:bg-dark-secondary">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-black dark:text-white">Usage overview</h2>
        <p className="text-sm text-black/60 dark:text-white/60">
          Activity metrics for the past {stats.period.toLowerCase()}.
        </p>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <StatBlock label="Chats started" value={stats.chatCount.toLocaleString()} highlight />
        <StatBlock label="Messages sent" value={stats.messageCount.toLocaleString()} />
        <StatBlock label="Avg messages per chat" value={averageMessages.toLocaleString()} />
        <StatBlock label="Last login" value={stats.lastLoginLabel ?? '—'} />
      </div>

      <div className="mt-6 rounded-xl border border-light-200/60 bg-light-100/40 p-4 text-sm text-black/60 dark:border-dark-200/60 dark:bg-dark-200/40 dark:text-white/60">
        {stats.chatCount === 0 && stats.messageCount === 0 ? (
          <p>No activity detected for this period.</p>
        ) : (
          <p>
            This account started {stats.chatCount.toLocaleString()} chat{stats.chatCount === 1 ? '' : 's'} and sent {stats.messageCount.toLocaleString()} message{stats.messageCount === 1 ? '' : 's'} over the last {stats.period.toLowerCase()}.
          </p>
        )}
        {stats.lastLogin && (
          <p className="mt-2 text-xs text-black/50 dark:text-white/50">
            Last sign-in: {formatDate(stats.lastLogin)}.
          </p>
        )}
      </div>
    </section>
  );
}

function StatBlock({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={
        highlight
          ? 'rounded-xl border border-sky-200 bg-sky-50 p-4 text-center dark:border-sky-900/40 dark:bg-sky-900/20'
          : 'rounded-xl border border-light-200/70 bg-light-100/60 p-4 text-center dark:border-dark-200/70 dark:bg-dark-200/40'
      }
    >
      <p className="text-xs uppercase tracking-wide text-black/60 dark:text-white/60">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-black dark:text-white">{value}</p>
    </div>
  );
}

export default UserStatsCard;
