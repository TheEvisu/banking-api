import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Account } from '../../accounts/entities/account.entity';

export type TransactionType = 'deposit' | 'withdrawal';

@Entity({ name: 'transactions' })
@Index('IDX_transactions_account_created_id', ['accountId', 'createdAt', 'id'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId!: string;

  @ManyToOne(() => Account, (account) => account.transactions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'account_id' })
  account?: Account;

  @Column({ type: 'varchar', length: 20 })
  type!: TransactionType;

  @Column({ type: 'numeric', precision: 19, scale: 4 })
  amount!: string;

  @Column({ name: 'balance_after', type: 'numeric', precision: 19, scale: 4 })
  balanceAfter!: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 64, nullable: true })
  idempotencyKey!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
