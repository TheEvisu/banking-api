import { MigrationInterface, QueryRunner } from 'typeorm';

export class StatementCursorIndex1735000005000 implements MigrationInterface {
  name = 'StatementCursorIndex1735000005000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_transactions_account_created"');
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_account_created_id"
         ON transactions (account_id, created_at DESC, id DESC)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_transactions_account_created_id"');
    await queryRunner.query(
      'CREATE INDEX "IDX_transactions_account_created" ON transactions (account_id, created_at DESC)',
    );
  }
}
