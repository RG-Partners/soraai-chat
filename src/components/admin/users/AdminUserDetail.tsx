"use client";

import {
  Fragment,
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition } from '@headlessui/react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  ChevronLeft,
  Loader2,
  Lock,
  Shield,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  deleteUserAction,
  updateUserDetailsAction,
  updateUserImageAction,
  updateUserPasswordAction,
  type UpdateUserPasswordActionState,
  type UserActionState,
} from '@/app/api/user/actions';
import { updateUserBanStatusAction } from '@/app/api/admin/actions';
import type {
  BasicUserWithLastLogin,
  UserAccountInfo,
  UserStats,
} from '@/lib/user/types';
import { cn } from '@/lib/utils';
import { UserAvatarUpload } from '@/components/Settings/UserDetail/UserAvatarUpload';
import type { DeleteUserActionState } from '@/app/api/user/validations';
import { UserRoleBadges } from '@/components/admin/users/UserRoleBadges';
import { UserStatusBadge } from '@/components/admin/users/UserStatusBadge';
import { UserRoleDialog } from '@/components/admin/users/UserRoleDialog';
import { UserSessionsCard } from '@/components/admin/users/UserSessionsCard';
import { UserStatsCard } from '@/components/admin/users/UserStatsCard';
import type { SerializableSession, NormalizedUserStats } from '@/components/admin/users/types';

type SerializableUser = Omit<BasicUserWithLastLogin, 'createdAt' | 'updatedAt' | 'lastLogin' | 'banExpires'> & {
  createdAt: string | null;
  updatedAt: string | null;
  lastLogin: string | null;
  banExpires: string | null;
};

type NormalizedUser = Omit<BasicUserWithLastLogin, 'createdAt' | 'updatedAt' | 'lastLogin' | 'banExpires'> & {
  createdAt: Date | null;
  updatedAt: Date | null;
  lastLogin: Date | null;
  banExpires: Date | null;
};

const normalizeUser = (user: SerializableUser | BasicUserWithLastLogin): NormalizedUser => ({
  ...user,
  createdAt: user.createdAt ? new Date(user.createdAt) : null,
  updatedAt: user.updatedAt ? new Date(user.updatedAt) : null,
  lastLogin: user.lastLogin ? new Date(user.lastLogin) : null,
  banExpires: user.banExpires ? new Date(user.banExpires) : null,
});

interface AdminUserDetailProps {
  initialUser: SerializableUser;
  initialAccount: UserAccountInfo;
  initialStats: UserStats;
  initialSessions: SerializableSession[];
  currentUserId: string;
  returnUrl: string;
}

export function AdminUserDetail({
  initialUser,
  initialAccount,
  initialStats,
  initialSessions,
  currentUserId,
  returnUrl,
}: AdminUserDetailProps) {
  const router = useRouter();
  const [user, setUser] = useState<NormalizedUser>(() => normalizeUser(initialUser));
  const [account] = useState<UserAccountInfo>(initialAccount);
  const [stats] = useState<UserStats>(initialStats);
  const [sessions, setSessions] = useState<SerializableSession[]>(initialSessions);
  const [isAvatarUpdating, setIsAvatarUpdating] = useState(false);
  const [isBanDialogOpen, setBanDialogOpen] = useState(false);
  const [isRoleDialogOpen, setRoleDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const isCurrentUser = user.id === currentUserId;

  const [profileForm, setProfileForm] = useState({
    name: user.name ?? '',
    email: user.email,
  });

  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  useEffect(() => {
    setProfileForm({
      name: user.name ?? '',
      email: user.email,
    });
  }, [user.name, user.email]);

  const [_profileResult, profileAction, profilePending] = useActionState(
    async (_prev: UserActionState | undefined, formData: FormData) => {
      formData.set('userId', user.id);
      const result = await updateUserDetailsAction(_prev, formData);

      if (result?.success && result.user) {
        const nextUser = normalizeUser(result.user);
        setUser(nextUser);
        toast.success(result.message ?? 'User details updated.');
      } else if (result?.message) {
        toast.error(result.message);
      } else {
        toast.error('Failed to update profile details.');
      }

      return result;
    },
    undefined as UserActionState | undefined,
  );

  const [passwordResult, passwordAction, passwordPending] = useActionState(
    async (_prev: UpdateUserPasswordActionState | undefined, formData: FormData) => {
      formData.set('userId', user.id);
      formData.set('isCurrentUser', String(isCurrentUser));
      const result = await updateUserPasswordAction(_prev, formData);

      if (result?.success) {
        toast.success(result.message ?? 'Password updated.');
        setPasswordDialogOpen(false);
      } else if (result?.message) {
        toast.error(result.message);
      } else {
        toast.error('Failed to update password.');
      }

      return result;
    },
    undefined as UpdateUserPasswordActionState | undefined,
  );

  const [isStatusPending, startStatusTransition] = useTransition();
  const [isDeletionPending, startDeletionTransition] = useTransition();

  const formattedProviders = useMemo(() => {
    if (!account.oauthProviders?.length) {
      return 'Email & password';
    }

    return account.oauthProviders
      .map((provider) => provider.replace(/^[a-z]/, (char) => char.toUpperCase()))
      .join(', ');
  }, [account.oauthProviders]);

  const formattedJoined = user.createdAt ? format(user.createdAt, 'MMM d, yyyy') : '—';
  const formattedUpdated = user.updatedAt ? format(user.updatedAt, 'MMM d, yyyy') : '—';
  const formattedLastLogin = user.lastLogin ? format(user.lastLogin, 'MMM d, yyyy p') : '—';

  const normalizedStats = useMemo<NormalizedUserStats>(() => {
    const lastLogin = user.lastLogin ?? null;
    return {
      chatCount: stats.chatCount,
      messageCount: stats.messageCount,
      period: stats.period,
      lastLogin,
      lastLoginLabel: lastLogin ? formatDistanceToNow(lastLogin, { addSuffix: true }) : '—',
    } as NormalizedUserStats;
  }, [stats.chatCount, stats.messageCount, stats.period, user.lastLogin]);

  const handleAvatarUpload = useCallback(
    async (imageUrl: string) => {
      setIsAvatarUpdating(true);
      try {
        const formData = new FormData();
        formData.append('userId', user.id);
        formData.append('image', imageUrl);
        const result = await updateUserImageAction(undefined, formData);

        if (result?.success && result.user) {
          const nextUser = normalizeUser(result.user);
          setUser(nextUser);
          toast.success(result.message ?? 'Profile photo updated.');
          return true;
        }

        toast.error(result?.message ?? 'Failed to update profile photo.');
        return false;
      } catch (error) {
        console.error('Failed to update user avatar', error);
        toast.error('Failed to update profile photo.');
        return false;
      } finally {
        setIsAvatarUpdating(false);
      }
    },
    [user.id],
  );

  const handleBanToggle = useCallback(
    (currentStatus: boolean, reason?: string) => {
      const formData = new FormData();
      formData.append('userId', user.id);
      formData.append('banned', currentStatus ? 'true' : 'false');
      if (!currentStatus && reason) {
        formData.append('banReason', reason);
      }

      startStatusTransition(() => {
        void (async () => {
          const result = await updateUserBanStatusAction(undefined, formData);

          if (result?.success && result.user) {
            const nextUser = normalizeUser(result.user);
            setUser(nextUser);
            toast.success(result.message ?? (currentStatus ? 'User unbanned.' : 'User banned.'));
            setBanDialogOpen(false);
            setBanReason('');
            setSessions([]);
          } else {
            toast.error(result?.message ?? 'Failed to update user status.');
          }
        })();
      });
    },
    [user.id],
  );

  const handleRoleUpdated = useCallback(
    (updated: BasicUserWithLastLogin) => {
      setUser(normalizeUser(updated));
      setSessions([]);
      setRoleDialogOpen(false);
    },
    [],
  );

  const handleDeleteUser = useCallback(() => {
    const formData = new FormData();
    formData.append('userId', user.id);

    startDeletionTransition(() => {
      void (async () => {
        const result = (await deleteUserAction(undefined, formData)) as DeleteUserActionState | null;

        if (result?.success) {
          toast.success(result.message ?? 'User deleted successfully.');
          setDeleteDialogOpen(false);
          router.push(result.redirect ?? returnUrl);
        } else {
          toast.error(result?.message ?? 'Failed to delete user.');
        }
      })();
    });
  }, [router, returnUrl, user.id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push(returnUrl)}
          className="inline-flex items-center gap-2 rounded-full border border-light-200/70 bg-white px-3 py-1 text-sm font-medium text-black shadow-sm transition hover:bg-light-200/60 dark:border-dark-200/70 dark:bg-dark-secondary dark:text-white dark:hover:bg-dark-200/60"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <div className="text-right text-xs text-black/50 dark:text-white/50">
          <div>Joined: {formattedJoined}</div>
          <div>Last updated: {formattedUpdated}</div>
          <div>Last login: {formattedLastLogin}</div>
        </div>
      </div>

      <section className="rounded-2xl border border-light-200/70 bg-white p-6 shadow-sm dark:border-dark-200/70 dark:bg-dark-secondary">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-black dark:text-white">{user.name || user.email}</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Manage account details, roles, and access settings.
          </p>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr),minmax(0,0.8fr)]">
          <ProfileCard
            user={user}
            profileForm={profileForm}
            setProfileForm={setProfileForm}
            onAvatarUpload={handleAvatarUpload}
            account={account}
            profileAction={profileAction}
            profilePending={profilePending || isAvatarUpdating}
          />

          <AccessCard
            user={user}
            account={account}
            formattedProviders={formattedProviders}
            statusPending={isStatusPending}
            passwordPending={passwordPending}
            onOpenRoleDialog={() => setRoleDialogOpen(true)}
            onOpenBanDialog={() => {
              setBanDialogOpen(true);
              setBanReason('');
            }}
            onOpenPasswordDialog={() => setPasswordDialogOpen(true)}
            onOpenDeleteDialog={() => setDeleteDialogOpen(true)}
            isCurrentUser={isCurrentUser}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <UserStatsCard stats={normalizedStats} />
        <UserSessionsCard sessions={sessions} />
      </div>

      <UserRoleDialog
        open={isRoleDialogOpen && !isCurrentUser}
        onClose={() => setRoleDialogOpen(false)}
        userId={user.id}
        currentRole={user.role}
        disabled={isCurrentUser}
        onRoleUpdated={handleRoleUpdated}
      />

      <BanDialog
        open={isBanDialogOpen}
        onClose={() => setBanDialogOpen(false)}
        isPending={isStatusPending}
        user={user}
        banReason={banReason}
        onBanReasonChange={setBanReason}
        onConfirm={() => handleBanToggle(Boolean(user.banned), banReason)}
      />

      <PasswordDialog
        open={isPasswordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
        action={passwordAction}
        pending={passwordPending}
        isCurrentUser={isCurrentUser}
        state={passwordResult}
      />

      <DeleteDialog
        open={isDeleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteUser}
        pending={isDeletionPending}
        user={user}
      />
    </div>
  );
}

type ProfileCardProps = {
  user: NormalizedUser;
  profileForm: { name: string; email: string };
  setProfileForm: Dispatch<SetStateAction<{ name: string; email: string }>>;
  onAvatarUpload: (imageUrl: string) => Promise<boolean>;
  account: UserAccountInfo;
  profileAction: (formData: FormData) => void;
  profilePending: boolean;
};

function ProfileCard({
  user,
  profileForm,
  setProfileForm,
  onAvatarUpload,
  account,
  profileAction,
  profilePending,
}: ProfileCardProps) {
  const isSsoAccount = account.oauthProviders?.length > 0;

  return (
    <div className="space-y-6 rounded-2xl border border-light-200/70 bg-white p-6 shadow-sm dark:border-dark-200/70 dark:bg-dark-tertiary">
      <div className="flex flex-col items-center gap-4">
        <UserAvatarUpload
          name={user.name}
          email={user.email}
          image={user.image}
          onUploadComplete={onAvatarUpload}
          disabled={profilePending}
        />
      </div>

      <form action={profileAction} className="space-y-4">
        <input type="hidden" name="userId" value={user.id} />
        <div className="space-y-2">
          <label className="text-sm font-medium text-black/70 dark:text-white/70" htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            name="name"
            value={profileForm.name}
            onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
            required
            disabled={profilePending}
            className="w-full rounded-lg border border-light-200/70 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-200/70 dark:bg-dark-secondary dark:text-white dark:focus:border-sky-500"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-black/70 dark:text-white/70" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={profileForm.email}
            onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
            disabled={isSsoAccount || profilePending}
            className="w-full rounded-lg border border-light-200/70 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-200/70 dark:bg-dark-secondary dark:text-white dark:focus:border-sky-500"
          />
          {isSsoAccount && (
            <p className="text-xs text-black/60 dark:text-white/60">
              Email cannot be updated for SSO accounts.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={profilePending}
          className="flex w-full items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {profilePending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Save changes'
          )}
        </button>
      </form>
    </div>
  );
}

type AccessCardProps = {
  user: NormalizedUser;
  account: UserAccountInfo;
  formattedProviders: string;
  statusPending: boolean;
  passwordPending: boolean;
  onOpenRoleDialog: () => void;
  onOpenBanDialog: () => void;
  onOpenPasswordDialog: () => void;
  onOpenDeleteDialog: () => void;
  isCurrentUser: boolean;
};

function AccessCard({
  user,
  account,
  formattedProviders,
  statusPending,
  passwordPending,
  onOpenRoleDialog,
  onOpenBanDialog,
  onOpenPasswordDialog,
  onOpenDeleteDialog,
  isCurrentUser,
}: AccessCardProps) {
  const canModify = !isCurrentUser;

  return (
    <div className="space-y-6 rounded-2xl border border-light-200/70 bg-white p-6 shadow-sm dark:border-dark-200/70 dark:bg-dark-tertiary">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase text-black/70 dark:text-white/70">
            <Shield className="h-4 w-4" /> Roles
          </h3>
          {canModify && (
            <button
              type="button"
              onClick={onOpenRoleDialog}
              className="inline-flex items-center gap-2 rounded-full border border-light-200/70 bg-white px-3 py-1 text-xs font-medium text-black shadow-sm transition hover:bg-light-200/60 dark:border-dark-200/70 dark:bg-dark-secondary dark:text-white dark:hover:bg-dark-200/60"
            >
              Update role
            </button>
          )}
        </div>
        <UserRoleBadges
          role={user.role}
          interactive={canModify}
          disabled={!canModify}
          onClick={canModify ? onOpenRoleDialog : undefined}
        />
        {!canModify && (
          <p className="text-xs text-black/60 dark:text-white/60">
            You cannot modify your own role.
          </p>
        )}
      </section>

      <section className="space-y-3 border-t border-light-200/60 pt-4 dark:border-dark-200/60">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase text-black/70 dark:text-white/70">
            Status
          </h3>
          {canModify && (
            <button
              type="button"
              onClick={onOpenBanDialog}
              disabled={statusPending}
              className="inline-flex items-center gap-2 rounded-full border border-light-200/70 bg-white px-3 py-1 text-xs font-medium text-black shadow-sm transition hover:bg-light-200/60 disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-200/70 dark:bg-dark-secondary dark:text-white dark:hover:bg-dark-200/60"
            >
              {statusPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : user.banned ? (
                'Unban user'
              ) : (
                'Ban user'
              )}
            </button>
          )}
        </div>
        <UserStatusBadge
          banned={user.banned}
          banReason={user.banReason}
          interactive={canModify}
          disabled={statusPending}
          onClick={canModify ? onOpenBanDialog : undefined}
        />
        {user.banExpires && (
          <p className="text-xs text-black/60 dark:text-white/60">
            Ban expires {format(user.banExpires, 'MMM d, yyyy p')}.
          </p>
        )}
      </section>

      <section className="space-y-3 border-t border-light-200/60 pt-4 dark:border-dark-200/60">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase text-black/70 dark:text-white/70">
          <Lock className="h-4 w-4" /> Security
        </h3>
        <div className="rounded-lg border border-light-200/70 bg-white px-4 py-3 text-sm text-black dark:border-dark-200/70 dark:bg-dark-secondary dark:text-white">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Password login</p>
              <p className="text-xs text-black/60 dark:text-white/60">
                {account.hasPassword ? 'Password can be reset.' : 'No password set via email login.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenPasswordDialog}
              disabled={!account.hasPassword || passwordPending}
              className="inline-flex items-center gap-2 rounded-full border border-light-200/70 bg-white px-3 py-1 text-xs font-medium text-black shadow-sm transition hover:bg-light-200/60 disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-200/70 dark:bg-dark-secondary dark:text-white dark:hover:bg-dark-200/60"
            >
              {passwordPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Reset password'}
            </button>
          </div>
          <div className="mt-3 text-xs text-black/60 dark:text-white/60">
            Providers: {formattedProviders}
          </div>
        </div>
      </section>

      {canModify && (
        <section className="space-y-3 border-t border-light-200/60 pt-4 dark:border-dark-200/60">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase text-red-600 dark:text-red-300">
            <AlertTriangle className="h-4 w-4" /> Danger zone
          </h3>
          <button
            type="button"
            onClick={onOpenDeleteDialog}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
          >
            <Trash2 className="h-4 w-4" /> Delete user
          </button>
        </section>
      )}
    </div>
  );
}

type BanDialogProps = {
  open: boolean;
  onClose: () => void;
  isPending: boolean;
  user: NormalizedUser;
  banReason: string;
  onBanReasonChange: (value: string) => void;
  onConfirm: () => void;
};

function BanDialog({ open, onClose, isPending, user, banReason, onBanReasonChange, onConfirm }: BanDialogProps) {
  const title = user.banned ? 'Unban user' : 'Ban user';
  const description = user.banned
    ? 'This will restore access for this account immediately.'
    : 'Choose whether to remove this user’s access. You can optionally provide a reason.';

  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      {!user.banned && (
        <div className="space-y-2">
          <label htmlFor="ban-reason" className="text-sm font-medium text-black/70 dark:text-white/70">
            Ban reason (optional)
          </label>
          <textarea
            id="ban-reason"
            value={banReason}
            onChange={(event) => onBanReasonChange(event.target.value)}
            rows={3}
            className="w-full rounded-lg border border-light-200/70 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-dark-200/70 dark:bg-dark-secondary dark:text-white"
            placeholder="Suspicious activity"
          />
        </div>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-light-200/70 bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-light-200/60 dark:border-dark-200/70 dark:bg-dark-secondary dark:text-white dark:hover:bg-dark-200/60"
          disabled={isPending}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition',
            user.banned ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700',
            isPending && 'cursor-not-allowed opacity-60',
          )}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : user.banned ? (
            'Unban user'
          ) : (
            'Ban user'
          )}
        </button>
      </div>
    </Modal>
  );
}

type PasswordDialogProps = {
  open: boolean;
  onClose: () => void;
  action: (formData: FormData) => void;
  pending: boolean;
  isCurrentUser: boolean;
  state: UpdateUserPasswordActionState | undefined;
};

function PasswordDialog({ open, onClose, action, pending, isCurrentUser, state }: PasswordDialogProps) {
  const [formValues, setFormValues] = useState({
    current: '',
    next: '',
    confirm: '',
  });

  useEffect(() => {
    if (!open) {
      setFormValues({ current: '', next: '', confirm: '' });
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isCurrentUser ? 'Update your password' : 'Set a new password'}
      description={isCurrentUser ? 'Enter your current and new password to update this account.' : 'Create a new password for this user. They will be signed out of other sessions.'}
    >
      <form action={action} className="space-y-4">
        {isCurrentUser && (
          <div className="space-y-2">
            <label htmlFor="currentPassword" className="text-sm font-medium text-black/70 dark:text-white/70">
              Current password
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              value={formValues.current}
              onChange={(event) => setFormValues((prev) => ({ ...prev, current: event.target.value }))}
              required
              className="w-full rounded-lg border border-light-200/70 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-dark-200/70 dark:bg-dark-secondary dark:text-white"
            />
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="newPassword" className="text-sm font-medium text-black/70 dark:text-white/70">
            New password
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            value={formValues.next}
            onChange={(event) => setFormValues((prev) => ({ ...prev, next: event.target.value }))}
            required
            className="w-full rounded-lg border border-light-200/70 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-dark-200/70 dark:bg-dark-secondary dark:text-white"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-black/70 dark:text-white/70">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formValues.confirm}
            onChange={(event) => setFormValues((prev) => ({ ...prev, confirm: event.target.value }))}
            required
            className="w-full rounded-lg border border-light-200/70 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-dark-200/70 dark:bg-dark-secondary dark:text-white"
          />
        </div>

        <input type="hidden" name="isCurrentUser" value={String(isCurrentUser)} />

        {state?.success === false && state.message && (
          <p className="text-sm font-medium text-red-600 dark:text-red-300">
            {state.message}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-light-200/70 bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-light-200/60 dark:border-dark-200/70 dark:bg-dark-secondary dark:text-white dark:hover:bg-dark-200/60"
            disabled={pending}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update password'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

type DeleteDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
  user: NormalizedUser;
};

function DeleteDialog({ open, onClose, onConfirm, pending, user }: DeleteDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete user"
      description={`Are you sure you want to delete ${user.name ?? user.email}? This action cannot be undone.`}
    >
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-light-200/70 bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-light-200/60 dark:border-dark-200/70 dark:bg-dark-secondary dark:text-white dark:hover:bg-dark-200/60"
          disabled={pending}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Delete user
        </button>
      </div>
    </Modal>
  );
}

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
};

function Modal({ open, onClose, title, description, children }: ModalProps) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl border border-light-200/70 bg-white p-6 shadow-xl transition-all dark:border-dark-200/70 dark:bg-dark-secondary">
                <div className="space-y-2">
                  <DialogTitle className="text-lg font-semibold text-black dark:text-white">
                    {title}
                  </DialogTitle>
                  {description && (
                    <p className="text-sm text-black/60 dark:text-white/60">{description}</p>
                  )}
                </div>
                <div className="mt-4 space-y-4">{children}</div>
              </DialogPanel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

export default AdminUserDetail;
