import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTransactions1735000003000 implements MigrationInterface {
  name = 'CreateTransactions1735000003000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE transactions (
        id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id       uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
        type             varchar(20) NOT NULL,
        amount           numeric(19,4) NOT NULL,
        balance_after    numeric(19,4) NOT NULL,
        idempotency_key  varchar(64) NULL,
        description      varchar(500) NULL,
        created_at       timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_tx_amount_positive CHECK (amount > 0),
        CONSTRAINT chk_tx_type CHECK (type IN ('deposit', 'withdrawal'))
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_transactions_account_created" ON transactions (account_id, created_at DESC)',
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_transactions_account_idempotency"
         ON transactions (account_id, idempotency_key)
         WHERE idempotency_key IS NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE transactions');
  }
}
