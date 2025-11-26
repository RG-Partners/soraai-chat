'use client';

import { cn } from '@/lib/utils';

interface UserStatusBadgeProps {
  banned?: boolean | null;
  banReason?: string | null;
  interactive?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

const BASE_CLASS = 'inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold';

export function UserStatusBadge({
  banned,
  banReason,
  interactive = false,
  disabled = false,
  onClick,
  className,
}: UserStatusBadgeProps) {
  const isBanned = Boolean(banned);
  const isClickable = interactive && !disabled && typeof onClick === 'function';

  const badgeClassName = cn(
    BASE_CLASS,
    isBanned
      ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200'
      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
    isClickable && 'cursor-pointer transition hover:opacity-80',
    disabled && 'opacity-60 cursor-not-allowed',
    className,
  );

  const handleClick = () => {
    if (isClickable) {
      onClick();
    }
  };

  return (
    <div className="space-y-1">
      <span className={badgeClassName} onClick={handleClick}>
        {isBanned ? 'Banned' : 'Active'}
      </span>
      {isBanned && banReason && (
        <p className="text-xs text-black/60 dark:text-white/60">Reason: {banReason}</p>
      )}
    </div>
  );
}

export default UserStatusBadge;
