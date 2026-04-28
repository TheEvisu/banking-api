import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAccounts1735000002000 implements MigrationInterface {
  name = 'CreateAccounts1735000002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE accounts (
        id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        person_id                uuid NOT NULL REFERENCES persons(id) ON DELETE RESTRICT,
        account_number           varchar(20) NOT NULL,
        balance                  numeric(19,4) NOT NULL DEFAULT 0,
        daily_withdrawal_limit   numeric(19,4) NOT NULL DEFAULT 2000.00,
        is_blocked               boolean NOT NULL DEFAULT false,
        blocked_at               timestamptz NULL,
        blocked_reason           varchar(500) NULL,
        created_at               timestamptz NOT NULL DEFAULT now(),
        updated_at               timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_accounts_account_number UNIQUE (account_number),
        CONSTRAINT chk_accounts_balance_nonneg CHECK (balance >= 0),
        CONSTRAINT chk_accounts_daily_limit_nonneg CHECK (daily_withdrawal_limit >= 0)
      )
    `);
    await queryRunner.query('CREATE INDEX "IDX_accounts_person_id" ON accounts (person_id)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE accounts');
  }
}
