import './setup-env';

import { ensureSchema } from './helpers/migrations';

export default async function globalSetup(): Promise<void> {
  await ensureSchema();
}
