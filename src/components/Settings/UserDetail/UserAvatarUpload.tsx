'use client';

import { type ChangeEvent, useCallback, useMemo, useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { UserAvatar } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';
import { useFileUpload } from '@/lib/hooks/useFileUpload';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export type UserAvatarUploadProps = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  onUploadComplete: (imageUrl: string) => Promise<boolean>;
  disabled?: boolean;
};

export function UserAvatarUpload({
  name,
  email,
  image,
  onUploadComplete,
  disabled = false,
}: UserAvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading } = useFileUpload();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const effectiveImage = useMemo(() => previewUrl ?? image ?? null, [image, previewUrl]);
  const isBusy = disabled || isUploading;

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileDialog = () => {
    if (isBusy) {
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileSelect = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      if (!ALLOWED_TYPES.has(file.type)) {
        toast.error('Please upload a JPEG, PNG, or WebP image.');
        resetFileInput();
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error('Image must be smaller than 5MB.');
        resetFileInput();
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(typeof reader.result === 'string' ? reader.result : null);
      };
      reader.readAsDataURL(file);

      const result = await upload(file);
      if (!result) {
        setPreviewUrl(null);
        resetFileInput();
        return;
      }

      setPreviewUrl(result.url);
      const succeeded = await onUploadComplete(result.url);
      if (!succeeded) {
        setPreviewUrl(null);
      } else {
        // Allow parent state to update before clearing the preview overlay
        setTimeout(() => setPreviewUrl(null), 150);
      }

      resetFileInput();
    },
    [upload, onUploadComplete],
  );

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <UserAvatar
          name={name}
          email={email}
          image={effectiveImage}
          size="xl"
          className={cn('ring-2 ring-offset-2 ring-light-200 dark:ring-dark-200', isBusy && 'opacity-80')}
        />
        {(isUploading || previewUrl !== null) && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
            <Loader2 className="size-6 animate-spin text-white" />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleFileDialog}
        disabled={isBusy}
        className={cn(
          'mt-4 inline-flex items-center gap-2 rounded-full border border-light-200/70 bg-white px-4 py-2 text-sm font-medium text-black shadow-sm transition hover:bg-light-200/60 disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-200/70 dark:bg-dark-secondary dark:text-white dark:hover:bg-dark-200/60',
        )}
      >
        <Upload className="size-4" />
        {isUploading ? 'Uploading…' : 'Change photo'}
      </button>

      <p className="mt-2 text-xs text-black/60 dark:text-white/60">
        JPG, PNG, or WebP up to 5MB.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept={Array.from(ALLOWED_TYPES).join(',')}
        onChange={handleFileSelect}
        className="hidden"
        disabled={isBusy}
      />
    </div>
  );
}
