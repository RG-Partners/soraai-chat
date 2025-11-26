import fs from 'node:fs';
import path from 'node:path';
import logger from './utils/logger.mjs';

const ROOT = process.cwd();
const FILE_NAME = 'openai-compatible.config.json';
const CONFIG_PATH = path.join(ROOT, FILE_NAME);
const ENV_PATH = path.join(ROOT, '.env');
const ENV_KEY = 'OPENAI_COMPATIBLE_DATA';

const loadProviders = () => {
  if (!fs.existsSync(CONFIG_PATH)) {
    logger.warn(`${FILE_NAME} not found. Nothing to parse.`);
    return [];
  }

  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) {
      throw new Error('Configuration root must be an array.');
    }
    return data;
  } catch (error) {
    logger.error(`Failed to parse ${FILE_NAME}.`, error);
    return [];
  }
};

const updateEnvVariable = (key, value) => {
  let content = '';
  if (fs.existsSync(ENV_PATH)) {
    content = fs.readFileSync(ENV_PATH, 'utf-8');
  }

  const lines = content.split(/\r?\n/);
  const entries = new Map();

  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) {
      continue;
    }
    const index = line.indexOf('=');
    if (index === -1) continue;
    const entryKey = line.slice(0, index).trim();
    const entryValue = line.slice(index + 1);
    entries.set(entryKey, entryValue);
  }

  entries.set(key, value);

  const serialized = Array.from(entries.entries())
    .map(([entryKey, entryValue]) => `${entryKey}=${entryValue}`)
    .join('\n');

  try {
    fs.writeFileSync(ENV_PATH, serialized + '\n', 'utf-8');
    logger.info(`Updated ${key} in .env`);
    return true;
  } catch (error) {
    logger.error('Failed to write .env file.', error);
    return false;
  }
};

const main = () => {
  const providers = loadProviders();
  const serialized = JSON.stringify(providers);
  const success = updateEnvVariable(ENV_KEY, serialized);

  if (!success) {
    process.exit(1);
  }
};

main();
