import type { SessionUser } from '@/lib/auth/auth-instance';

export type UserPreferences = {
  displayName?: string;
  profession?: string;
  responseStyleExample?: string;
  botName?: string;
};

export type BasicUser = {
  id: string;
  email: string;
  name: string | null;
  image?: string | null;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BasicUserWithLastLogin = BasicUser & {
  lastLogin: Date | null;
};

export type UserAccountInfo = {
  hasPassword: boolean;
  oauthProviders: string[];
};

export type UserDetailsPayload = {
  user: BasicUserWithLastLogin;
  account: UserAccountInfo;
};

export type UserStats = {
  chatCount: number;
  messageCount: number;
  period: string;
};

export type UserSessionInfo = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type CurrentSessionUser = SessionUser;
