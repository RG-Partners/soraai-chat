export class FileNotFoundError extends Error {
  constructor(public key: string, cause?: unknown) {
    super(`File not found: ${key}`);
    this.name = 'FileNotFoundError';
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}
