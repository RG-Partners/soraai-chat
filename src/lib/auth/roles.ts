import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements } from 'better-auth/plugins/admin/access';
import { APP_RESOURCES, PERMISSION_TYPES } from '@/types/permissions';

export const USER_ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  USER: 'user',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

const KNOWN_ROLES = new Set<UserRole>(Object.values(USER_ROLES));

const sanitizeRoleToken = (rawToken: string): UserRole | null => {
  const trimmed = rawToken.trim();
  if (!trimmed) {
    return null;
  }

  const roleToken = trimmed.slice(trimmed.lastIndexOf(':') + 1).toLowerCase();

  return KNOWN_ROLES.has(roleToken as UserRole)
    ? (roleToken as UserRole)
    : null;
};

export const normalizeRoles = (value?: string | null): UserRole[] => {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map(sanitizeRoleToken)
    .filter((role): role is UserRole => role !== null);
};

const resolveDefaultRole = (): UserRole => {
  const envRole = process.env.DEFAULT_USER_ROLE?.toLowerCase();
  if (envRole && KNOWN_ROLES.has(envRole as UserRole)) {
    return envRole as UserRole;
  }

  return USER_ROLES.USER;
};

export const DEFAULT_USER_ROLE: UserRole = resolveDefaultRole();

export const getPrimaryRole = (value?: string | null): UserRole => {
  const [primary] = normalizeRoles(value);
  return primary ?? DEFAULT_USER_ROLE;
};

export const hasRole = (value: string | null | undefined, role: UserRole) =>
  normalizeRoles(value).includes(role);

export const isAdminRole = (role?: string | null) =>
  hasRole(role, USER_ROLES.ADMIN);

export const isEditorRole = (role?: string | null) =>
  hasRole(role, USER_ROLES.EDITOR) || isAdminRole(role);

export const isUserRole = (role?: string | null) =>
  normalizeRoles(role).length === 0 || hasRole(role, USER_ROLES.USER);

const providerPermissions = [
  PERMISSION_TYPES.CREATE,
  PERMISSION_TYPES.VIEW,
  PERMISSION_TYPES.UPDATE,
  PERMISSION_TYPES.DELETE,
  PERMISSION_TYPES.LIST,
];

const configPermissions = [PERMISSION_TYPES.VIEW, PERMISSION_TYPES.UPDATE];

const uploadPermissions = [
  PERMISSION_TYPES.CREATE,
  PERMISSION_TYPES.DELETE,
  PERMISSION_TYPES.VIEW,
  PERMISSION_TYPES.LIST,
];

const chatPermissions = [
  PERMISSION_TYPES.CREATE,
  PERMISSION_TYPES.VIEW,
  PERMISSION_TYPES.UPDATE,
  PERMISSION_TYPES.DELETE,
  PERMISSION_TYPES.LIST,
  PERMISSION_TYPES.USE,
];

export const accessControl = createAccessControl({
  ...defaultStatements,
  [APP_RESOURCES.PROVIDER]: providerPermissions,
  [APP_RESOURCES.CONFIG]: configPermissions,
  [APP_RESOURCES.UPLOAD]: uploadPermissions,
  [APP_RESOURCES.CHAT]: chatPermissions,
});

export const userRoleDefinition = accessControl.newRole({
  user: [],
  session: [],
  [APP_RESOURCES.PROVIDER]: [
    PERMISSION_TYPES.VIEW,
    PERMISSION_TYPES.LIST,
  ],
  [APP_RESOURCES.CONFIG]: [PERMISSION_TYPES.VIEW],
  [APP_RESOURCES.UPLOAD]: uploadPermissions,
  [APP_RESOURCES.CHAT]: chatPermissions,
});

export const editorRoleDefinition = accessControl.newRole({
  user: [],
  session: [],
  [APP_RESOURCES.PROVIDER]: providerPermissions,
  [APP_RESOURCES.CONFIG]: configPermissions,
  [APP_RESOURCES.UPLOAD]: uploadPermissions,
  [APP_RESOURCES.CHAT]: chatPermissions,
});

export const adminRoleDefinition = accessControl.newRole({
  user: [...defaultStatements.user],
  session: [...defaultStatements.session],
  [APP_RESOURCES.PROVIDER]: providerPermissions,
  [APP_RESOURCES.CONFIG]: configPermissions,
  [APP_RESOURCES.UPLOAD]: uploadPermissions,
  [APP_RESOURCES.CHAT]: chatPermissions,
});

export const userRolesInfo: Record<
  UserRole,
  {
    label: string;
    description: string;
  }
> = {
  [USER_ROLES.ADMIN]: {
    label: 'Admin',
    description: 'Administrator with full access to manage the application.',
  },
  [USER_ROLES.EDITOR]: {
    label: 'Editor',
    description:
      'Default role for users who can configure providers and manage resources.',
  },
  [USER_ROLES.USER]: {
    label: 'User',
    description: 'Basic user role with read and chat capabilities.',
  },
};

export const ac = accessControl;
export const user = userRoleDefinition;
export const editor = editorRoleDefinition;
export const admin = adminRoleDefinition;
