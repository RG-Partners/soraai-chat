'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

const SignOutButton = ({ className }: { className?: string }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const t = useTranslations('Auth');

  const handleSignOut = async () => {
    if (loading) {
      return;
    }

    try {
      setLoading(true);
      await authClient.signOut();
      router.push('/sign-in');
      router.refresh();
    } catch (error: any) {
      const message = error?.error || error?.message || t('signOutFailed');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className={cn(
        'p-2.5 rounded-full bg-light-200 text-black/70 dark:bg-dark-200 dark:text-white/70 transition duration-200 hover:opacity-70 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70',
        className,
      )}
      aria-label={t('signOut')}
      title={t('signOut')}
    >
      <LogOut size={19} />
    </button>
  );
};

export default SignOutButton;
