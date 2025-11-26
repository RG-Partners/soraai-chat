import { APP_RESOURCES, PERMISSION_TYPES, type PermissionType } from '@/types/permissions';
import { adminRoleDefinition, editorRoleDefinition, userRoleDefinition } from './roles';
import { parseRoleString, type BetterAuthRole } from './types';

const ROLE_MAP: Record<'admin' | 'editor' | 'user', BetterAuthRole> = {
  admin: adminRoleDefinition,
  editor: editorRoleDefinition,
  user: userRoleDefinition,
};

const statementsFor = (role: string | undefined | null) => {
  const parsed = parseRoleString(role);
  return ROLE_MAP[parsed]?.statements ?? {};
};

const hasPermission = (
  role: string | undefined | null,
  resource: (typeof APP_RESOURCES)[keyof typeof APP_RESOURCES],
  permission: PermissionType,
) => {
  const statements = statementsFor(role);
  const resourcePermissions = statements[resource] ?? [];
  return Array.isArray(resourcePermissions) && resourcePermissions.includes(permission);
};

export const canManageProviders = (role: string | undefined | null) =>
  hasPermission(role, APP_RESOURCES.PROVIDER, PERMISSION_TYPES.CREATE) ||
  hasPermission(role, APP_RESOURCES.PROVIDER, PERMISSION_TYPES.UPDATE) ||
  hasPermission(role, APP_RESOURCES.PROVIDER, PERMISSION_TYPES.DELETE);

export const canViewProviders = (role: string | undefined | null) =>
  hasPermission(role, APP_RESOURCES.PROVIDER, PERMISSION_TYPES.VIEW) ||
  hasPermission(role, APP_RESOURCES.PROVIDER, PERMISSION_TYPES.LIST);

export const canManageConfig = (role: string | undefined | null) =>
  hasPermission(role, APP_RESOURCES.CONFIG, PERMISSION_TYPES.UPDATE);

export const canViewConfig = (role: string | undefined | null) =>
  hasPermission(role, APP_RESOURCES.CONFIG, PERMISSION_TYPES.VIEW);

export const canUploadFiles = (role: string | undefined | null) =>
  hasPermission(role, APP_RESOURCES.UPLOAD, PERMISSION_TYPES.CREATE);

export const canManageChats = (role: string | undefined | null) =>
  hasPermission(role, APP_RESOURCES.CHAT, PERMISSION_TYPES.UPDATE) ||
  hasPermission(role, APP_RESOURCES.CHAT, PERMISSION_TYPES.DELETE);
