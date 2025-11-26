import './load-env';
import configManager from '../src/lib/config';

(async () => {
  const config = configManager.getCurrentConfig();
  console.log(JSON.stringify(config, null, 2));
})();
