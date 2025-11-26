import { Buffer } from 'node:buffer';
import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth/server';
import logger from '@/lib/logger';
import { serverFileStorage, storageDriver } from '@/lib/storage';

import { checkStorageAction } from '../actions';

const storageUploadLogger = logger.withDefaults({ tag: 'api:storage:upload' });

export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const storageCheck = await checkStorageAction();
  if (!storageCheck.isValid) {
    storageUploadLogger.error('Storage configuration invalid.', storageCheck);
    return NextResponse.json(
      {
        error: storageCheck.error,
        solution: storageCheck.solution,
        storageDriver,
      },
      { status: 500 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided. Use the 'file' field in FormData." },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await serverFileStorage.upload(buffer, {
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
    });

    return NextResponse.json({
      success: true,
      key: result.key,
      url: result.sourceUrl,
      metadata: result.metadata,
    });
  } catch (error) {
    storageUploadLogger.error('Failed to upload file.', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 },
    );
  }
}
