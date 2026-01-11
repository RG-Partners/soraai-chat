export type UsageEventType =
  | 'chat_response'
  | 'chat_error'
  | 'chat_rate_limited'
  | 'search_response'
  | 'search_error';

export interface UsageEventInput {
  eventType: UsageEventType;
  userId?: string | null;
  chatId?: string | null;
  focusMode?: string | null;
  providerId?: string | null;
  modelKey?: string | null;
  embeddingProviderId?: string | null;
  embeddingModelKey?: string | null;
  optimizationMode?: string | null;
  responseTimeMs?: number | null;
  messageCount?: number;
  messageChars?: number;
  sourceCount?: number;
  fileCount?: number;
  isError?: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date;
}

export interface AnalyticsRange {
  start: Date;
  end: Date;
  rangeDays: number;
}

export interface AnalyticsDailyDatum {
  date: string;
  chats: number;
  messages: number;
  activeUsers: number;
}

export interface AnalyticsFocusModeDatum {
  focusMode: string;
  chats: number;
}

export interface AnalyticsProviderDatum {
  providerId: string | null;
  modelKey: string | null;
  responses: number;
  avgResponseTimeMs: number | null;
  errorRate: number;
}

export interface AnalyticsTopUserDatum {
  userId: string;
  email: string;
  name: string | null;
  chats: number;
  lastActive: string | null;
}

export interface AnalyticsSummary {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  chats: number;
  messages: number;
  avgMessagesPerChat: number;
  avgResponseTimeMs: number | null;
  errorRate: number;
}

export interface AnalyticsDashboardData {
  range: {
    start: string;
    end: string;
    rangeDays: number;
  };
  summary: AnalyticsSummary;
  daily: AnalyticsDailyDatum[];
  focusModes: AnalyticsFocusModeDatum[];
  providers: AnalyticsProviderDatum[];
  topUsers: AnalyticsTopUserDatum[];
}
