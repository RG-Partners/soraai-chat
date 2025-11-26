'use server';

import { IS_VERCEL_ENV } from '@/lib/constants/runtime';
import { storageDriver } from '@/lib/storage';

interface StorageCheckResult {
  isValid: boolean;
  error?: string;
  solution?: string;
}

export async function getStorageInfoAction() {
  return {
    type: storageDriver,
    supportsDirectUpload:
      storageDriver === 'vercel-blob' || storageDriver === 's3',
  };
}

export async function checkStorageAction(): Promise<StorageCheckResult> {
  if (storageDriver === 'vercel-blob') {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return {
        isValid: false,
        error: 'BLOB_READ_WRITE_TOKEN is not set',
        solution:
          'Configure Vercel Blob for this project:\n' +
          '1. Open the Vercel Dashboard\n' +
          '2. Create or attach a Blob Store\n' +
          '3. Expose the BLOB_READ_WRITE_TOKEN to the deployment' +
          (IS_VERCEL_ENV
            ? '\n4. Redeploy the application'
            : '\n4. Run `vercel env pull` to sync the token locally'),
      };
    }
  }

  if (storageDriver === 's3') {
    const missing: string[] = [];

    if (!process.env.FILE_STORAGE_S3_BUCKET) {
      missing.push('FILE_STORAGE_S3_BUCKET');
    }

    if (!process.env.FILE_STORAGE_S3_REGION && !process.env.AWS_REGION) {
      missing.push('FILE_STORAGE_S3_REGION or AWS_REGION');
    }

    if (missing.length > 0) {
      return {
        isValid: false,
        error: `Missing S3 configuration: ${missing.join(', ')}`,
        solution:
          'Provide the required S3 environment variables:\n' +
          "- FILE_STORAGE_TYPE=s3\n" +
          '- FILE_STORAGE_S3_BUCKET=your-bucket\n' +
          '- FILE_STORAGE_S3_REGION=your-region (e.g. us-east-1)\n' +
          '(Optional) FILE_STORAGE_S3_PUBLIC_BASE_URL to serve public URLs\n' +
          '(Optional) FILE_STORAGE_S3_ENDPOINT for S3-compatible services\n' +
          '(Optional) FILE_STORAGE_S3_FORCE_PATH_STYLE=1 for path-style endpoints',
      };
    }

    return { isValid: true };
  }

  if (!['vercel-blob', 's3'].includes(storageDriver)) {
    return {
      isValid: false,
      error: `Invalid storage driver: ${storageDriver}`,
      solution: "FILE_STORAGE_TYPE must be either 'vercel-blob' or 's3'",
    };
  }

  return { isValid: true };
}
