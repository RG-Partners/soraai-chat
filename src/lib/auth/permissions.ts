import 'server-only';

import { getSession, type SessionUser } from './server';
import {
  USER_ROLES,
  getPrimaryRole,
  hasRole,
  isAdminRole,
  isEditorRole,
} from './roles';

const ensureSession = async () => {
  const session = await getSession();
  return session ?? null;
};

export const getCurrentUser = async (): Promise<SessionUser | null> => {
  const session = await ensureSession();
  return session?.user ?? null;
};

export const hasAdminPermission = async () => {
  const session = await ensureSession();
  if (!session?.user) {
    return false;
  }

  return isAdminRole(session.user.role);
};

export const requireAdminPermission = async (action = 'perform this action') => {
  const allowed = await hasAdminPermission();
  if (!allowed) {
    throw new Error(`Unauthorized: Admin access required to ${action}`);
  }
};

export const canListUsers = async () => {
  return await hasAdminPermission();
};

export const requireUserListPermission = async (action = 'list users') => {
  const allowed = await canListUsers();
  if (!allowed) {
    throw new Error(`Unauthorized: Admin access required to ${action}`);
  }
};

export const canManageUsers = async () => {
  return await hasAdminPermission();
};

export const requireUserManagePermission = async (
  action = 'manage users',
) => {
  const allowed = await canManageUsers();
  if (!allowed) {
    throw new Error(`Unauthorized: Admin access required to ${action}`);
  }
};

export const canManageUser = async (targetUserId: string) => {
  const session = await ensureSession();

  if (!session?.user) {
    return false;
  }

  if (session.user.id === targetUserId) {
    return true;
  }

  return await hasAdminPermission();
};

export const requireUserManagePermissionFor = async (
  targetUserId: string,
  action = 'manage this user',
) => {
  const allowed = await canManageUser(targetUserId);
  if (!allowed) {
    throw new Error(`Unauthorized: Admin access required to ${action}`);
  }
};

export const hasEditorPermission = async () => {
  const session = await ensureSession();
  if (!session?.user) {
    return false;
  }

  return isEditorRole(session.user.role);
};

export const requireEditorPermission = async (
  action = 'perform this action',
) => {
  const allowed = await hasEditorPermission();
  if (!allowed) {
    throw new Error(
      `Unauthorized: Editor or Admin access required to ${action}`,
    );
  }
};

export const hasUserPermission = async () => {
  const session = await ensureSession();
  if (!session?.user) {
    return false;
  }

  const primaryRole = getPrimaryRole(session.user.role);
  return (
    primaryRole === USER_ROLES.USER ||
    primaryRole === USER_ROLES.EDITOR ||
    primaryRole === USER_ROLES.ADMIN
  );
};

export const hasProviderManagementPermission = async () =>
  await hasEditorPermission();

export const requireProviderManagementPermission = async (
  action = 'manage providers',
) => {
  const allowed = await hasProviderManagementPermission();
  if (!allowed) {
    throw new Error(`Unauthorized: Editor or Admin access required to ${action}`);
  }
};

export const hasConfigManagementPermission = async () =>
  await hasEditorPermission();

export const requireConfigManagementPermission = async (
  action = 'manage configuration',
) => {
  const allowed = await hasConfigManagementPermission();
  if (!allowed) {
    throw new Error(
      `Unauthorized: Editor or Admin access required to ${action}`,
    );
  }
};

export const hasUploadPermission = async () => {
  const session = await ensureSession();
  if (!session?.user) {
    return false;
  }

  const role = getPrimaryRole(session.user.role);
  return (
    role === USER_ROLES.USER || role === USER_ROLES.EDITOR || role === USER_ROLES.ADMIN
  );
};

export const hasRoleInSession = async (role: keyof typeof USER_ROLES) => {
  const session = await ensureSession();
  if (!session?.user) {
    return false;
  }

  return hasRole(session.user.role, USER_ROLES[role]);
};

export const ensureAuthenticated = async () => {
  const session = await ensureSession();
  if (!session?.user) {
    throw new Error('Unauthorized: Sign in required.');
  }

  return session.user;
};
