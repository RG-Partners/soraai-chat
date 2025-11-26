'use client';

import { cn } from '@/lib/utils';
import { normalizeRoles, userRolesInfo, type UserRole } from '@/lib/auth/roles';

interface UserRoleBadgesProps {
  role?: string | null;
  interactive?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

const ROLE_BADGE_BASE =
  'inline-flex items-center gap-1 rounded-full bg-light-100 px-2 py-1 text-xs font-medium uppercase tracking-wide text-black/60 dark:bg-dark-200 dark:text-white/60';

export function UserRoleBadges({
  role,
  interactive = false,
  disabled = false,
  onClick,
  className,
}: UserRoleBadgesProps) {
  const roles = normalizeRoles(role);

  if (roles.length === 0) {
    return (
      <span className={cn(ROLE_BADGE_BASE, className)}>User</span>
    );
  }

  const isClickable = interactive && !disabled && typeof onClick === 'function';

  const badgeClassName = cn(
    ROLE_BADGE_BASE,
    isClickable && 'cursor-pointer border border-light-200/70 bg-white text-black shadow-sm transition hover:bg-light-200/70 dark:border-dark-200/70 dark:bg-dark-secondary dark:text-white dark:hover:bg-dark-200/60',
    disabled && 'opacity-60 cursor-not-allowed',
  );

  const handleClick = () => {
    if (isClickable) {
      onClick();
    }
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {roles.map((roleToken) => (
        <span
          key={roleToken}
          onClick={handleClick}
          className={badgeClassName}
        >
          {resolveRoleLabel(roleToken)}
        </span>
      ))}
    </div>
  );
}

const resolveRoleLabel = (role: UserRole) => userRolesInfo[role]?.label ?? role;

export default UserRoleBadges;
