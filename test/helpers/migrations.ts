import { DataSource } from 'typeorm';

import { EnablePgcrypto1735000000000 } from '../../src/database/migrations/1735000000000-EnablePgcrypto';
import { CreatePersons1735000001000 } from '../../src/database/migrations/1735000001000-CreatePersons';
import { CreateAccounts1735000002000 } from '../../src/database/migrations/1735000002000-CreateAccounts';
import { CreateTransactions1735000003000 } from '../../src/database/migrations/1735000003000-CreateTransactions';
import { AccountNumberSequence1735000004000 } from '../../src/database/migrations/1735000004000-AccountNumberSequence';
import { StatementCursorIndex1735000005000 } from '../../src/database/migrations/1735000005000-StatementCursorIndex';

export async function ensureSchema(): Promise<void> {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '55432', 10),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [],
    migrations: [
      EnablePgcrypto1735000000000,
      CreatePersons1735000001000,
      CreateAccounts1735000002000,
      CreateTransactions1735000003000,
      AccountNumberSequence1735000004000,
      StatementCursorIndex1735000005000,
    ],
    synchronize: false,
    logging: false,
  });

  await ds.initialize();
  try {
    const executed = await ds.showMigrations();
    if (executed) {
      await ds.runMigrations({ transaction: 'each' });
    }
  } finally {
    await ds.destroy();
  }
}
