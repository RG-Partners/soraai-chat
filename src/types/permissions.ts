export const APP_RESOURCES = {
  PROVIDER: 'provider',
  CONFIG: 'config',
  CHAT: 'chat',
  UPLOAD: 'upload',
} as const;

export type AppResource = (typeof APP_RESOURCES)[keyof typeof APP_RESOURCES];

export const PERMISSION_TYPES = {
  CREATE: 'create',
  VIEW: 'view',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  USE: 'use',
  SHARE: 'share',
} as const;

export type PermissionType =
  (typeof PERMISSION_TYPES)[keyof typeof PERMISSION_TYPES];
