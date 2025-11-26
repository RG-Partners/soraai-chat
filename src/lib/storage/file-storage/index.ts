import type { FileStorage } from './file-storage.interface';
import { createS3FileStorage } from './s3-file-storage';
import { createVercelBlobStorage } from './vercel-blob-storage';

export type FileStorageDriver = 'vercel-blob' | 's3';

const isDev = process.env.NODE_ENV !== 'production';

const resolveDriver = (): FileStorageDriver => {
  const candidate = process.env.FILE_STORAGE_TYPE?.trim().toLowerCase();
  if (candidate === 'vercel-blob' || candidate === 's3') {
    return candidate;
  }
  return 'vercel-blob';
};

declare global {
  // eslint-disable-next-line no-var
  var __soraai_file_storage__: FileStorage | undefined;
}

const storageDriver = resolveDriver();

const createFileStorage = (): FileStorage => {
  switch (storageDriver) {
    case 'vercel-blob':
      return createVercelBlobStorage();
    case 's3':
      return createS3FileStorage();
    default: {
      const exhaustive: never = storageDriver;
      throw new Error(`Unsupported file storage driver: ${exhaustive}`);
    }
  }
};

const serverFileStorage =
  globalThis.__soraai_file_storage__ ?? createFileStorage();

if (isDev) {
  globalThis.__soraai_file_storage__ = serverFileStorage;
}

export { serverFileStorage, storageDriver };
