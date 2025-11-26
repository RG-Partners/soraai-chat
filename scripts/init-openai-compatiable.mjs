import fs from 'node:fs';
import path from 'node:path';
import logger from './utils/logger.mjs';

const ROOT = process.cwd();
const FILE_NAME = 'openai-compatible.config.json';
const CONFIG_PATH = path.join(ROOT, FILE_NAME);

const CONFIG_TEMPLATE = JSON.stringify(
  [
    {
      provider: 'Groq',
      apiKey: 'YOUR_GROQ_API_KEY',
      baseUrl: 'https://api.groq.com/openai/v1',
      models: [
        {
          apiName: 'llama3-8b-8192',
          uiName: 'Llama 3 8B',
          supportsTools: true,
        },
      ],
    },
  ],
  null,
  2,
);

const ensureConfigFile = () => {
  if (fs.existsSync(CONFIG_PATH)) {
    logger.info(`${FILE_NAME} already exists. Skipping scaffold.`);
    return true;
  }

  try {
    fs.writeFileSync(CONFIG_PATH, CONFIG_TEMPLATE, 'utf-8');
    logger.info(`${FILE_NAME} created. Update it with your OpenAI-compatible providers.`);
    return true;
  } catch (error) {
    logger.error(`Failed to create ${FILE_NAME}.`, error);
    return false;
  }
};

const main = () => {
  if (!ensureConfigFile()) {
    process.exit(1);
  }
};

main();
