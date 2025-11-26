'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { upload as uploadToVercelBlob } from '@vercel/blob/client';
import { toast } from 'sonner';

import { getStorageInfoAction } from '@/app/api/storage/actions';

export type StorageType = 'vercel-blob' | 's3' | 'local' | string;

export type UploadResult = {
  pathname: string;
  url: string;
  contentType?: string;
  size?: number;
};

type StorageInfo = {
  type: StorageType;
  supportsDirectUpload: boolean;
};

type UploadOptions = {
  filename?: string;
  contentType?: string;
};

type UseFileUploadState = {
  upload: (file: File, options?: UploadOptions) => Promise<UploadResult | undefined>;
  isUploading: boolean;
  storageType: StorageType | null;
};

const ensureFileInstance = (file: unknown): file is File => file instanceof File;

const SERVER_UPLOAD_ENDPOINT = '/api/storage/upload';
const UPLOAD_URL_ENDPOINT = '/api/storage/upload-url';

export const useFileUpload = (): UseFileUploadState => {
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [loadingStorageInfo, setLoadingStorageInfo] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadStorageInfo = async () => {
      try {
        const info = await getStorageInfoAction();
        if (!isMounted) {
          return;
        }
        setStorageInfo(info ?? null);
      } catch (error) {
        console.error('Failed to load storage info', error);
        if (isMounted) {
          setStorageInfo(null);
        }
      } finally {
        if (isMounted) {
          setLoadingStorageInfo(false);
        }
      }
    };

    void loadStorageInfo();

    return () => {
      isMounted = false;
    };
  }, []);

  const storageType = useMemo(() => storageInfo?.type ?? null, [storageInfo]);

  const upload = useCallback(
    async (file: File, options?: UploadOptions): Promise<UploadResult | undefined> => {
      if (!ensureFileInstance(file)) {
        toast.error('Upload expects a File instance');
        return undefined;
      }

      if (loadingStorageInfo) {
        toast.error('Storage configuration is still loading. Please try again.');
        return undefined;
      }

      const filename = options?.filename ?? file.name;
      const contentType = options?.contentType || file.type || 'application/octet-stream';

      setIsUploading(true);
      try {
        if (storageType === 'vercel-blob') {
          const blob = await uploadToVercelBlob(filename, file, {
            access: 'public',
            contentType,
            handleUploadUrl: UPLOAD_URL_ENDPOINT,
          });

          return {
            pathname: blob.pathname,
            url: blob.url,
            contentType: blob.contentType,
            size: file.size,
          } satisfies UploadResult;
        }

        if (storageInfo?.supportsDirectUpload && storageType === 's3') {
          const response = await fetch(UPLOAD_URL_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, contentType }),
          });

          if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            const message = errorBody.error || 'Failed to get upload URL';
            if (errorBody.solution) {
              toast.error(message, {
                description: errorBody.solution as string,
                duration: 10000,
              });
            } else {
              toast.error(message);
            }
            return undefined;
          }

          const uploadData: {
            key: string;
            url: string;
            method?: string;
            headers?: Record<string, string>;
            sourceUrl?: string;
          } = await response.json();

          const uploadResponse = await fetch(uploadData.url, {
            method: uploadData.method ?? 'PUT',
            headers: uploadData.headers ?? { 'Content-Type': contentType },
            body: file,
          });

          if (!uploadResponse.ok) {
            toast.error(`Upload failed: ${uploadResponse.status}`);
            return undefined;
          }

          return {
            pathname: uploadData.key,
            url: uploadData.sourceUrl ?? uploadData.url,
            contentType,
            size: file.size,
          } satisfies UploadResult;
        }

        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch(SERVER_UPLOAD_ENDPOINT, {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorBody = await uploadResponse.json().catch(() => ({}));
          const message = errorBody.error || 'Server upload failed';
          if (errorBody.solution) {
            toast.error(message, {
              description: errorBody.solution as string,
              duration: 10000,
            });
          } else {
            toast.error(message);
          }
          return undefined;
        }

        const payload: {
          key: string;
          url: string;
          metadata?: { contentType?: string; size?: number };
        } = await uploadResponse.json();

        return {
          pathname: payload.key,
          url: payload.url,
          contentType: payload.metadata?.contentType,
          size: payload.metadata?.size,
        } satisfies UploadResult;
      } catch (error) {
        console.error('Upload failed', error);
        const message = error instanceof Error ? error.message : 'Upload failed';
        toast.error(message);
        return undefined;
      } finally {
        setIsUploading(false);
      }
    },
    [loadingStorageInfo, storageInfo, storageType],
  );

  return {
    upload,
    isUploading: isUploading || loadingStorageInfo,
    storageType,
  };
};

export type UseFileUploadResult = ReturnType<typeof useFileUpload>;
