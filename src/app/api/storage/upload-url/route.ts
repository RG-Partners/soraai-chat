import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth/server';
import logger from '@/lib/logger';
import { serverFileStorage, storageDriver } from '@/lib/storage';

import { checkStorageAction } from '../actions';

const storageUploadUrlLogger = logger.withDefaults({ tag: 'api:storage:upload-url' });

const DEFAULT_UPLOAD_EXPIRES_SECONDS = 3600;
const FALLBACK_UPLOAD_URL = '/api/storage/upload';

type GenericUploadRequest = {
  filename?: string;
  contentType?: string;
};

type FallbackResponse = {
  directUploadSupported: false;
  fallbackUrl: string;
  message: string;
};

const createFallbackResponse = (): FallbackResponse => ({
  directUploadSupported: false,
  fallbackUrl: FALLBACK_UPLOAD_URL,
  message: 'Use multipart/form-data upload to fallbackUrl',
});

const isVercelBlobRequest = (body: unknown): body is HandleUploadBody =>
  typeof body === 'object' &&
  body !== null &&
  (body as HandleUploadBody).type === 'blob.generate-client-token';

const handleVercelBlobUpload = async (
  body: HandleUploadBody,
  request: Request,
  userId: string,
) => {
  const jsonResponse = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async () => ({
      allowedContentTypes: undefined,
      addRandomSuffix: true,
      tokenPayload: JSON.stringify({
        userId,
        uploadedAt: new Date().toISOString(),
      }),
    }),
    onUploadCompleted: async ({ blob, tokenPayload }) => {
      storageUploadUrlLogger.info('Upload completed.', {
        url: blob.url,
        pathname: blob.pathname,
        tokenPayload,
      });
    },
  });

  return NextResponse.json(jsonResponse);
};

const handleGenericUpload = async (request: GenericUploadRequest) => {
  if (typeof serverFileStorage.createUploadUrl !== 'function') {
    storageUploadUrlLogger.info(
      'Storage driver does not support direct upload URLs. Returning fallback.',
    );
    return NextResponse.json(createFallbackResponse());
  }

  const uploadUrl = await serverFileStorage.createUploadUrl({
    filename: request.filename || 'file',
    contentType: request.contentType || 'application/octet-stream',
    expiresInSeconds: DEFAULT_UPLOAD_EXPIRES_SECONDS,
  });

  if (!uploadUrl) {
    storageUploadUrlLogger.info('Storage driver returned null URL. Returning fallback.');
    return NextResponse.json(createFallbackResponse());
  }

  const sourceUrl = await serverFileStorage.getSourceUrl(uploadUrl.key);

  return NextResponse.json({
    directUploadSupported: true,
    ...uploadUrl,
    sourceUrl,
  });
};

export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const storageCheck = await checkStorageAction();
  if (!storageCheck.isValid) {
    storageUploadUrlLogger.error('Storage configuration invalid.', storageCheck);
    return NextResponse.json(
      {
        error: storageCheck.error,
        solution: storageCheck.solution,
        storageDriver,
      },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    if (isVercelBlobRequest(body)) {
      return await handleVercelBlobUpload(body, request, session.user.id);
    }

    return await handleGenericUpload(body as GenericUploadRequest);
  } catch (error) {
    storageUploadUrlLogger.error('Failed to create upload URL.', error);
    return NextResponse.json(
      { error: 'Failed to create upload URL' },
      { status: 500 },
    );
  }
}
