import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Person } from '../../persons/entities/person.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';

@Entity({ name: 'accounts' })
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_accounts_person_id')
  @Column({ name: 'person_id', type: 'uuid' })
  personId!: string;

  @ManyToOne(() => Person, (person) => person.accounts, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'person_id' })
  person?: Person;

  @Column({ name: 'account_number', type: 'varchar', length: 20, unique: true })
  accountNumber!: string;

  @Column({ type: 'numeric', precision: 19, scale: 4, default: '0' })
  balance!: string;

  @Column({
    name: 'daily_withdrawal_limit',
    type: 'numeric',
    precision: 19,
    scale: 4,
    default: '2000',
  })
  dailyWithdrawalLimit!: string;

  @Column({ name: 'is_blocked', type: 'boolean', default: false })
  isBlocked!: boolean;

  @Column({ name: 'blocked_at', type: 'timestamptz', nullable: true })
  blockedAt!: Date | null;

  @Column({ name: 'blocked_reason', type: 'varchar', length: 500, nullable: true })
  blockedReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => Transaction, (tx) => tx.account)
  transactions?: Transaction[];
}
