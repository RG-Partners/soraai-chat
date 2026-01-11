import { Metadata } from 'next';

import AdminNavigation from '@/components/admin/AdminNavigation';
import AnalyticsDashboard from '@/components/admin/analytics/AnalyticsDashboard';
import analyticsRepository from '@/lib/analytics/repository';
import { requireAdminSession } from '@/lib/admin/server';

export const metadata: Metadata = {
  title: 'Admin · Analytics',
};

interface AdminAnalyticsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const RANGE_OPTIONS = [7, 30, 90];
const DEFAULT_RANGE = 30;

const parseNumberParam = (value?: string | string[]) => {
  if (!value) {
    return undefined;
  }

  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw, 10);

  return Number.isFinite(parsed) ? parsed : undefined;
};

export default async function AdminAnalyticsPage({ searchParams }: AdminAnalyticsPageProps) {
  await requireAdminSession();

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rangeParam = parseNumberParam(resolvedSearchParams?.rangeDays);
  const selectedRange = rangeParam ?? DEFAULT_RANGE;

  const data = await analyticsRepository.getDashboardData({ rangeDays: selectedRange });

  return (
    <section className="space-y-6">
      <AdminNavigation />
      <AnalyticsDashboard data={data} selectedRange={selectedRange} rangeOptions={RANGE_OPTIONS} />
    </section>
  );
}
