'use client';

import { Fragment, useActionState, useEffect, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition } from '@headlessui/react';
import { Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';

import { updateUserRolesAction } from '@/app/api/admin/actions';
import type { UpdateUserRoleActionState } from '@/app/api/admin/validations';
import type { BasicUserWithLastLogin } from '@/lib/user/types';
import { USER_ROLES, normalizeRoles, userRolesInfo } from '@/lib/auth/roles';
import { cn } from '@/lib/utils';

interface UserRoleDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  currentRole?: string | null;
  disabled?: boolean;
  onRoleUpdated?: (user: BasicUserWithLastLogin) => void;
}

const ROLE_KEYS = Object.values(USER_ROLES);

export function UserRoleDialog({
  open,
  onClose,
  userId,
  currentRole,
  disabled = false,
  onRoleUpdated,
}: UserRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<string | null>(() => {
    const [primary] = normalizeRoles(currentRole);
    return primary ?? null;
  });

  useEffect(() => {
    if (open) {
      const [primary] = normalizeRoles(currentRole);
      setSelectedRole(primary ?? null);
    }
  }, [open, currentRole]);

  const [_, formAction, pending] = useActionState(
    async (_prevState: UpdateUserRoleActionState | undefined, formData: FormData) => {
      const result = await updateUserRolesAction(_prevState, formData);
      if (result?.success && result.user) {
        toast.success(result.message ?? 'Role updated.');
        onRoleUpdated?.(result.user);
        onClose();
      } else {
        toast.error(result?.message ?? 'Failed to update role.');
      }
      return result;
    },
    undefined,
  );

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
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
                <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-black dark:text-white">
                  <Shield className="h-5 w-5" />
                  Update user role
                </DialogTitle>
                <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                  Choose the appropriate access level for this user.
                </p>

                <form action={formAction} className="mt-6 space-y-4">
                  <input type="hidden" name="userId" value={userId} />
                  <div className="space-y-3">
                    {ROLE_KEYS.map((roleKey) => {
                      const info = userRolesInfo[roleKey];
                      const isSelected = selectedRole === roleKey;
                      return (
                        <label
                          key={roleKey}
                          className={cn(
                            'block cursor-pointer rounded-xl border border-light-200/70 bg-white px-4 py-3 text-left transition hover:border-sky-400 dark:border-dark-200/70 dark:bg-dark-tertiary dark:hover:border-sky-400/70',
                            isSelected && 'border-sky-500 shadow-sm',
                            (pending || disabled) && 'cursor-not-allowed opacity-60',
                          )}
                        >
                          <input
                            type="radio"
                            name="role"
                            value={roleKey}
                            className="hidden"
                            checked={isSelected}
                            onChange={() => setSelectedRole(roleKey)}
                            disabled={pending || disabled}
                          />
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-semibold text-black dark:text-white">
                              {info.label}
                            </span>
                            <span className="text-xs text-black/60 dark:text-white/60">
                              {info.description}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-full border border-light-200/70 bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-light-200/60 disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-200/70 dark:bg-dark-secondary dark:text-white dark:hover:bg-dark-200/60"
                      disabled={pending}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={pending || disabled || !selectedRole}
                      className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save role'}
                    </button>
                  </div>
                </form>
              </DialogPanel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

export default UserRoleDialog;
