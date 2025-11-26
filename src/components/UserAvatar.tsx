'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

type UserAvatarProps = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  size?: AvatarSize;
  className?: string;
};

const sizeStyles: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-xs',
  lg: 'h-10 w-10 text-sm',
  xl: 'h-20 w-20 text-2xl',
};

export const UserAvatar = ({
  name,
  email,
  image,
  size = 'md',
  className,
}: UserAvatarProps) => {
  const [isImageError, setIsImageError] = useState(false);

  const initial = useMemo(() => {
    const source = name?.trim() || email?.trim();
    return source ? source.charAt(0).toUpperCase() : '?';
  }, [email, name]);

  const showImage = Boolean(image) && !isImageError;
  const altText = name || email || 'User avatar';

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden rounded-full bg-light-200 text-black/80 dark:bg-dark-200 dark:text-white/80',
        sizeStyles[size],
        className,
      )}
    >
      {showImage ? (
        <img
          src={image as string}
          alt={altText}
          className="h-full w-full object-cover"
          onError={() => setIsImageError(true)}
          loading="lazy"
        />
      ) : (
        <span className="font-semibold">{initial}</span>
      )}
    </div>
  );
};
