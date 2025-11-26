import { createConsola, LogLevels } from 'consola';
import { IS_DEV, LOG_TAG } from './runtime.mjs';

const logger = createConsola({
  level: IS_DEV ? LogLevels.debug : LogLevels.info,
  defaults: {
    tag: LOG_TAG,
  },
});

export default logger;
