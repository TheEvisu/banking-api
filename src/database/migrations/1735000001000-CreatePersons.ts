import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePersons1735000001000 implements MigrationInterface {
  name = 'CreatePersons1735000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE persons (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        document    varchar(32) NOT NULL,
        full_name   varchar(200) NOT NULL,
        birth_date  date NOT NULL,
        created_at  timestamptz NOT NULL DEFAULT now(),
        updated_at  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_persons_document UNIQUE (document)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE persons');
  }
}
