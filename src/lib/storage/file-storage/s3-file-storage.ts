import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type {
  FileMetadata,
  FileStorage,
  UploadOptions,
  UploadUrl,
  UploadUrlOptions,
} from './file-storage.interface';
import { FileNotFoundError } from './errors';
import { resolveStoragePrefix, sanitizeFilename, toBuffer } from './storage-utils';

const STORAGE_PREFIX = resolveStoragePrefix();

const required = (name: string, value: string | undefined) => {
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
};

const buildKey = (filename: string) => {
  const safeName = sanitizeFilename(filename || 'file');
  const id = randomUUID();
  const prefix = STORAGE_PREFIX ? `${STORAGE_PREFIX}/` : '';
  return path.posix.join(prefix, `${id}-${safeName}`);
};

const sanitizeKey = (key: string) => key.replace(/^\/+/, '');

const buildPublicUrl = (
  bucket: string,
  region: string,
  key: string,
  publicBaseUrl?: string,
  endpoint?: string,
  forcePathStyle?: boolean,
) => {
  if (publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/$/, '')}/${encodeURI(key)}`;
  }

  if (endpoint) {
    const base = endpoint.replace(/\/$/, '');
    if (forcePathStyle) {
      return `${base}/${bucket}/${encodeURI(key)}`;
    }
    try {
      const url = new URL(base);
      return `${url.protocol}//${bucket}.${url.host}/${encodeURI(key)}`;
    } catch {
      return `${base}/${bucket}/${encodeURI(key)}`;
    }
  }

  return `https://${bucket}.s3.${region}.amazonaws.com/${encodeURI(key)}`;
};

export const createS3FileStorage = (): FileStorage => {
  const bucket = required('FILE_STORAGE_S3_BUCKET', process.env.FILE_STORAGE_S3_BUCKET);
  const region = process.env.FILE_STORAGE_S3_REGION || process.env.AWS_REGION;
  if (!region) {
    throw new Error('Missing required env: FILE_STORAGE_S3_REGION or AWS_REGION');
  }

  const endpoint = process.env.FILE_STORAGE_S3_ENDPOINT;
  const forcePathStyle = /^1|true$/i.test(process.env.FILE_STORAGE_S3_FORCE_PATH_STYLE || '');
  const publicBaseUrl = process.env.FILE_STORAGE_S3_PUBLIC_BASE_URL;

  const s3 = new S3Client({
    region,
    endpoint,
    forcePathStyle,
  });

  return {
    async upload(content, options: UploadOptions = {}) {
      const buffer = await toBuffer(content);
      const filename = options.filename ?? 'file';
      const key = sanitizeKey(options.key ?? buildKey(filename));

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: options.contentType,
        }),
      );

      const metadata: FileMetadata = {
        key,
        filename: path.posix.basename(key),
        contentType: options.contentType || 'application/octet-stream',
        size: buffer.byteLength,
        uploadedAt: new Date(),
      };

      const sourceUrl = buildPublicUrl(bucket, region, key, publicBaseUrl, endpoint, forcePathStyle);

      return { key, sourceUrl, metadata };
    },

    async createUploadUrl(options: UploadUrlOptions): Promise<UploadUrl | null> {
      const key = sanitizeKey(options.filename ? buildKey(options.filename) : buildKey('file'));
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: options.contentType,
      });
      const expires = Math.max(60, Math.min(60 * 60 * 12, options.expiresInSeconds ?? 900));
      const url = await getSignedUrl(s3, command, { expiresIn: expires });
      return {
        key,
        url,
        method: 'PUT',
        expiresAt: new Date(Date.now() + expires * 1000),
        headers: { 'Content-Type': options.contentType },
      };
    },

    async download(key) {
      try {
        const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        const body = res.Body;
        if (!body) {
          throw new FileNotFoundError(key);
        }
        const stream = body as unknown as NodeJS.ReadableStream;
        const chunks: Buffer[] = [];
        await new Promise<void>((resolve, reject) => {
          stream.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
          stream.once('end', () => resolve());
          stream.once('error', (err) => reject(err));
        });
        return Buffer.concat(chunks);
      } catch (error: unknown) {
        if ((error as any)?.$metadata?.httpStatusCode === 404) {
          throw new FileNotFoundError(key, error);
        }
        throw error;
      }
    },

    async delete(key) {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },

    async exists(key) {
      try {
        await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return true;
      } catch (error: unknown) {
        if ((error as any)?.$metadata?.httpStatusCode === 404) {
          return false;
        }
        throw error;
      }
    },

    async getMetadata(key) {
      try {
        const res = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return {
          key,
          filename: path.posix.basename(key),
          contentType: res.ContentType || 'application/octet-stream',
          size: Number(res.ContentLength || 0),
          uploadedAt: res.LastModified ?? undefined,
        } satisfies FileMetadata;
      } catch (error: unknown) {
        if ((error as any)?.$metadata?.httpStatusCode === 404) {
          return null;
        }
        throw error;
      }
    },

    async getSourceUrl(key) {
      return buildPublicUrl(bucket, region, key, publicBaseUrl, endpoint, forcePathStyle);
    },

    async getDownloadUrl(key) {
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      return getSignedUrl(s3, command, { expiresIn: 3600 });
    },
  } satisfies FileStorage;
};
