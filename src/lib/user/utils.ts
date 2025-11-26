import { USER_ROLES } from '@/lib/auth/roles';

type AvatarInput = {
  image?: string | null;
};

type RoleInput = {
  role?: string | null;
};

export const getUserAvatar = (user: AvatarInput): string => {
  const disableDefaultAvatar = process.env.DISABLE_DEFAULT_AVATAR === 'true';
  if (user.image && user.image.trim().length > 0) {
    return user.image;
  }

  if (disableDefaultAvatar) {
    return '';
  }

  return '/pf.png';
};

export const getIsUserAdmin = (user?: RoleInput): boolean => {
  if (!user?.role) {
    return false;
  }

  return user.role.split(',').includes(USER_ROLES.ADMIN);
};
