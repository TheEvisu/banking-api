import { MigrationInterface, QueryRunner } from 'typeorm';

export class AccountNumberSequence1735000004000 implements MigrationInterface {
  name = 'AccountNumberSequence1735000004000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE SEQUENCE IF NOT EXISTS accounts_number_seq');
    await queryRunner.query(`
      SELECT setval(
        'accounts_number_seq',
        COALESCE((SELECT MAX(CAST(account_number AS bigint)) FROM accounts), 0) + 1,
        false
      )
    `);
    await queryRunner.query(`
      ALTER TABLE accounts
        ALTER COLUMN account_number SET DEFAULT lpad(nextval('accounts_number_seq')::text, 7, '0')
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE accounts ALTER COLUMN account_number DROP DEFAULT');
    await queryRunner.query('DROP SEQUENCE IF EXISTS accounts_number_seq');
  }
}
