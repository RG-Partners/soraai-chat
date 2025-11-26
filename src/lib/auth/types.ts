import type { PermissionType } from '@/types/permissions';

export type RoleName = 'admin' | 'editor' | 'user';

export interface BetterAuthRole {
  statements: {
    user?: readonly string[];
    session?: readonly string[];
    [key: string]: readonly PermissionType[] | readonly string[] | undefined;
  };
}

export function parseRoleString(role: string | undefined | null): RoleName {
  if (!role) {
    return 'user';
  }

  const trimmed = role.trim();
  if (!trimmed) {
    return 'user';
  }

  const normalized = trimmed.slice(trimmed.lastIndexOf(':') + 1).toLowerCase();

  if (normalized === 'admin' || normalized === 'editor' || normalized === 'user') {
    return normalized;
  }

  console.warn(`Invalid role detected: ${role}, defaulting to user`);
  return 'user';
}

export function isBetterAuthRole(obj: unknown): obj is BetterAuthRole {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'statements' in obj &&
    typeof (obj as { statements: unknown }).statements === 'object'
  );
}
