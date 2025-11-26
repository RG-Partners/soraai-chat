import { createConsola, LogLevels } from 'consola';
import { IS_DEV, LOG_TAG } from '@/lib/constants/runtime';

const logger = createConsola({
  level: IS_DEV ? LogLevels.debug : LogLevels.info,
  defaults: {
    tag: LOG_TAG,
  },
});

export default logger;
