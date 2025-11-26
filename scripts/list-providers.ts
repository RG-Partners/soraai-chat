import './load-env';
import ModelRegistry from '../src/lib/models/registry';

(async () => {
  const registry = new ModelRegistry();
  const providers = await registry.getActiveProviders();
  console.log(JSON.stringify(providers, null, 2));
})();
