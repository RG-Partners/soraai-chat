const normalizeBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();

  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
};

export const IS_DEV = process.env.NODE_ENV !== 'production';
export const IS_VERCEL_ENV = process.env.VERCEL === '1';
export const IS_DOCKER_ENV = process.env.DOCKER_BUILD === '1';
export const FILE_BASED_MCP_CONFIG = normalizeBoolean(
  process.env.FILE_BASED_MCP_CONFIG,
  false,
);
export const LOG_TAG = (process.env.LOG_TAG ?? 'soraai').trim() || 'soraai';

export default {
  IS_DEV,
  IS_VERCEL_ENV,
  IS_DOCKER_ENV,
  FILE_BASED_MCP_CONFIG,
  LOG_TAG,
};
