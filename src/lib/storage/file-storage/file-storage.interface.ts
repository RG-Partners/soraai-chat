export type UploadContent =
  | Buffer
  | Blob
  | File
  | ArrayBuffer
  | ArrayBufferView
  | ReadableStream<Uint8Array>
  | NodeJS.ReadableStream;

export interface FileMetadata {
  key: string;
  filename: string;
  contentType: string;
  size: number;
  uploadedAt?: Date;
}

export interface UploadOptions {
  filename?: string;
  contentType?: string;
  /**
   * Optional absolute storage key. When provided the storage adapter must
   * store the file using this key instead of generating a random path.
   */
  key?: string;
}

export interface UploadResult {
  key: string;
  sourceUrl: string;
  metadata: FileMetadata;
}

export interface UploadUrlOptions {
  filename: string;
  contentType: string;
  expiresInSeconds?: number;
}

export type UploadUrlMethod = 'PUT' | 'POST';

export interface UploadUrl {
  key: string;
  url: string;
  method: UploadUrlMethod;
  expiresAt: Date;
  headers?: Record<string, string>;
  fields?: Record<string, string>;
}

export interface FileStorage {
  upload(content: UploadContent, options?: UploadOptions): Promise<UploadResult>;
  createUploadUrl?(options: UploadUrlOptions): Promise<UploadUrl | null>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getMetadata(key: string): Promise<FileMetadata | null>;
  getSourceUrl(key: string): Promise<string | null>;
  getDownloadUrl?(key: string): Promise<string | null>;
}
