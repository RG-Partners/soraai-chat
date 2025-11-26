import { buildExtractedKey, readJsonFromStorage } from '@/lib/storage/uploaded-files';

export const getFileDetails = async (fileId: string) => {
  const key = buildExtractedKey(fileId);
  const parsedFile = await readJsonFromStorage<{ title: string }>(key);

  return {
    name: parsedFile.title,
    fileId,
  };
};
