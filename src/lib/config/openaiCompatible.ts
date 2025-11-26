import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import logger from '@/lib/logger';

const CONFIG_FILENAME = 'openai-compatible.config.json';
const envLogger = logger.withDefaults({ tag: 'openai-compatible' });

const OpenAICompatibleModelSchema = z.object({
  apiName: z.string().min(1),
  uiName: z.string().min(1),
  supportsTools: z.boolean().optional().default(false),
});

const OpenAICompatibleProviderSchema = z.object({
  provider: z.string().min(1),
  apiKey: z.string().min(1),
  baseUrl: z.string().url(),
  models: z.array(OpenAICompatibleModelSchema).default([]),
});

export type OpenAICompatibleProvider = z.infer<
  typeof OpenAICompatibleProviderSchema
>;

const parseProviders = (raw: unknown): OpenAICompatibleProvider[] => {
  try {
    const parsed = z
      .array(OpenAICompatibleProviderSchema)
      .parse(raw ?? []);
    return parsed;
  } catch (error) {
    envLogger.error('Failed to validate OpenAI-compatible providers.', error);
    return [];
  }
};

const readFromEnv = () => {
  const raw = process.env.OPENAI_COMPATIBLE_DATA;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return parseProviders(parsed);
  } catch (error) {
    envLogger.error('Failed to parse OPENAI_COMPATIBLE_DATA.', error);
    return [];
  }
};

const readFromFile = () => {
  const filePath = path.join(process.cwd(), CONFIG_FILENAME);
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return parseProviders(data);
  } catch (error) {
    envLogger.error(`Failed to read ${CONFIG_FILENAME}.`, error);
    return [];
  }
};

export const loadOpenAICompatibleProviders = (): OpenAICompatibleProvider[] => {
  const fromEnv = readFromEnv();
  if (fromEnv.length > 0) {
    return fromEnv;
  }

  return readFromFile();
};
