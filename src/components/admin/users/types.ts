export type NormalizedUserStats = {
  chatCount: number;
  messageCount: number;
  period: string;
  lastLogin: Date | null;
  lastLoginLabel?: string;
};

export type SerializableSession = {
  id: string;
  createdAt: string | null;
  updatedAt: string | null;
  expiresAt: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};
