import dataSource from '../../config/typeorm.datasource';

import { seedInitialPerson } from './001-initial-person.seed';

async function main(): Promise<void> {
  await dataSource.initialize();
  try {
    await seedInitialPerson(dataSource);
    process.stdout.write('seed: complete\n');
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  process.stderr.write(`seed failed: ${(err as Error).stack ?? err}\n`);
  process.exit(1);
});
