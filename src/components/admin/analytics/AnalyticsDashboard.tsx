import type { AnalyticsDashboardData } from '@/lib/analytics/types';
import RangeSelector from './RangeSelector';

const numberFormatter = new Intl.NumberFormat('en-US');
const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const durationFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

const formatNumber = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) {
    return '0';
  }
  return numberFormatter.format(Math.round(value));
};

const formatAverage = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) {
    return '0.0';
  }
  return value.toFixed(1);
};

const formatRate = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return '0%';
  }
  return percentFormatter.format(Math.max(0, Math.min(value, 1)));
};

const formatDuration = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }
  return `${durationFormatter.format(value)} ms`;
};

const formatDateLabel = (iso: string) => {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const formatDateTimeLabel = (iso: string | null) => {
  if (!iso) {
    return '—';
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

interface AnalyticsDashboardProps {
  data: AnalyticsDashboardData;
  selectedRange: number;
  rangeOptions: number[];
}

export function AnalyticsDashboard({ data, selectedRange, rangeOptions }: AnalyticsDashboardProps) {
  type SummaryItem = {
    label: string;
    value: number | null | undefined;
    formatter: (value: number | null | undefined) => string;
    tone?: 'primary';
  };

  const summaryItems: SummaryItem[] = [
    {
      label: 'Total users',
      value: data.summary.totalUsers,
      formatter: formatNumber,
      tone: 'primary' as const,
    },
    {
      label: 'Active users',
      value: data.summary.activeUsers,
      formatter: formatNumber,
    },
    {
      label: 'New users',
      value: data.summary.newUsers,
      formatter: formatNumber,
    },
    {
      label: 'Chats',
      value: data.summary.chats,
      formatter: formatNumber,
    },
    {
      label: 'Messages',
      value: data.summary.messages,
      formatter: formatNumber,
    },
    {
      label: 'Avg msgs / chat',
      value: data.summary.avgMessagesPerChat,
      formatter: formatAverage,
    },
    {
      label: 'Avg response time',
      value: data.summary.avgResponseTimeMs,
      formatter: formatDuration,
    },
    {
      label: 'Error rate',
      value: data.summary.errorRate,
      formatter: formatRate,
    },
  ];

  const dailyRows = data.daily.slice(-Math.min(data.daily.length, 30));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-black dark:text-white">Usage analytics</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Monitor adoption, messaging volume, and model performance over the selected window.
          </p>
        </div>
        <RangeSelector options={rangeOptions} selected={selectedRange} defaultValue={rangeOptions[1] ?? rangeOptions[0]} />
      </div>

      <section className="rounded-2xl border border-light-200/70 bg-white p-6 shadow-sm dark:border-dark-200/70 dark:bg-dark-secondary">
        <header className="mb-6">
          <h2 className="text-lg font-semibold text-black dark:text-white">Overview</h2>
        </header>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className={
                item.tone === 'primary'
                  ? 'rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/40 dark:bg-sky-900/20'
                  : 'rounded-xl border border-light-200/70 bg-light-100/60 p-4 dark:border-dark-200/70 dark:bg-dark-200/40'
              }
            >
              <p className="text-xs uppercase tracking-wide text-black/60 dark:text-white/60">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-black dark:text-white">
                    {item.formatter(item.value)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-light-200/70 bg-white p-6 shadow-sm dark:border-dark-200/70 dark:bg-dark-secondary">
        <header className="mb-4">
          <h2 className="text-lg font-semibold text-black dark:text-white">Daily activity</h2>
          <p className="text-sm text-black/60 dark:text-white/60">
            Recent engagement across chats, messages, and distinct active users.
          </p>
        </header>
        {dailyRows.length === 0 ? (
          <div className="text-sm text-black/60 dark:text-white/60">No activity recorded in this range.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-light-200 dark:divide-dark-200 text-sm">
              <thead className="bg-light-100/60 text-left font-semibold uppercase tracking-wide text-black/60 dark:bg-black/20 dark:text-white/60">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Chats</th>
                  <th className="px-4 py-3">Messages</th>
                  <th className="px-4 py-3">Active users</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-200/70 dark:divide-dark-200/70">
                {dailyRows.map((row) => (
                  <tr key={row.date} className="bg-white odd:bg-light-100/40 dark:bg-dark-secondary dark:odd:bg-dark-200/40">
                    <td className="px-4 py-3 text-black/80 dark:text-white/80">{formatDateLabel(row.date)}</td>
                    <td className="px-4 py-3 text-black/70 dark:text-white/70">{formatNumber(row.chats)}</td>
                    <td className="px-4 py-3 text-black/70 dark:text-white/70">{formatNumber(row.messages)}</td>
                    <td className="px-4 py-3 text-black/70 dark:text-white/70">{formatNumber(row.activeUsers)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-light-200/70 bg-white p-6 shadow-sm dark:border-dark-200/70 dark:bg-dark-secondary">
          <header className="mb-4">
            <h2 className="text-lg font-semibold text-black dark:text-white">Focus modes</h2>
            <p className="text-sm text-black/60 dark:text-white/60">Conversation volume by configured focus mode.</p>
          </header>
          {data.focusModes.length === 0 ? (
            <div className="text-sm text-black/60 dark:text-white/60">No focus mode usage recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-light-200 dark:divide-dark-200 text-sm">
                <thead className="bg-light-100/60 text-left font-semibold uppercase tracking-wide text-black/60 dark:bg-black/20 dark:text-white/60">
                  <tr>
                    <th className="px-4 py-3">Focus mode</th>
                    <th className="px-4 py-3">Chats</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-200/70 dark:divide-dark-200/70">
                  {data.focusModes.map((mode) => (
                    <tr key={mode.focusMode} className="bg-white odd:bg-light-100/40 dark:bg-dark-secondary dark:odd:bg-dark-200/40">
                      <td className="px-4 py-3 text-black/80 capitalize dark:text-white/80">{mode.focusMode}</td>
                      <td className="px-4 py-3 text-black/70 dark:text-white/70">{formatNumber(mode.chats)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-light-200/70 bg-white p-6 shadow-sm dark:border-dark-200/70 dark:bg-dark-secondary">
          <header className="mb-4">
            <h2 className="text-lg font-semibold text-black dark:text-white">Model providers</h2>
            <p className="text-sm text-black/60 dark:text-white/60">
              Response volume, latency, and error rate by provider/model pair.
            </p>
          </header>
          {data.providers.length === 0 ? (
            <div className="text-sm text-black/60 dark:text-white/60">No provider usage recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-light-200 dark:divide-dark-200 text-sm">
                <thead className="bg-light-100/60 text-left font-semibold uppercase tracking-wide text-black/60 dark:bg-black/20 dark:text-white/60">
                  <tr>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Model</th>
                    <th className="px-4 py-3">Responses</th>
                    <th className="px-4 py-3">Avg response</th>
                    <th className="px-4 py-3">Error rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-200/70 dark:divide-dark-200/70">
                  {data.providers.map((provider) => (
                    <tr key={`${provider.providerId ?? 'unknown'}-${provider.modelKey ?? 'default'}`} className="bg-white odd:bg-light-100/40 dark:bg-dark-secondary dark:odd:bg-dark-200/40">
                      <td className="px-4 py-3 text-black/80 dark:text-white/80">{provider.providerId ?? 'Unknown'}</td>
                      <td className="px-4 py-3 text-black/60 dark:text-white/70">{provider.modelKey ?? '—'}</td>
                      <td className="px-4 py-3 text-black/70 dark:text-white/70">{formatNumber(provider.responses)}</td>
                      <td className="px-4 py-3 text-black/60 dark:text-white/70">{formatDuration(provider.avgResponseTimeMs)}</td>
                      <td className="px-4 py-3 text-black/60 dark:text-white/70">{formatRate(provider.errorRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-light-200/70 bg-white p-6 shadow-sm dark:border-dark-200/70 dark:bg-dark-secondary">
        <header className="mb-4">
          <h2 className="text-lg font-semibold text-black dark:text-white">Top users</h2>
          <p className="text-sm text-black/60 dark:text-white/60">
            Users with the highest chat volume during this window.
          </p>
        </header>
        {data.topUsers.length === 0 ? (
          <div className="text-sm text-black/60 dark:text-white/60">No chat activity captured for this range.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-light-200 dark:divide-dark-200 text-sm">
              <thead className="bg-light-100/60 text-left font-semibold uppercase tracking-wide text-black/60 dark:bg-black/20 dark:text-white/60">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Chats</th>
                  <th className="px-4 py-3">Last active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-200/70 dark:divide-dark-200/70">
                {data.topUsers.map((user) => (
                  <tr key={user.userId} className="bg-white odd:bg-light-100/40 dark:bg-dark-secondary dark:odd:bg-dark-200/40">
                    <td className="px-4 py-3 text-black/80 dark:text-white/80">
                      <div className="flex flex-col">
                        <span className="font-medium">{user.name || user.email}</span>
                        <span className="text-xs text-black/50 dark:text-white/50">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-black/70 dark:text-white/70">{formatNumber(user.chats)}</td>
                    <td className="px-4 py-3 text-black/60 dark:text-white/70">{formatDateTimeLabel(user.lastActive)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default AnalyticsDashboard;
