import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Account } from '../../accounts/entities/account.entity';

@Entity({ name: 'persons' })
export class Person {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  document!: string;

  @Column({ name: 'full_name', type: 'varchar', length: 200 })
  fullName!: string;

  @Column({ name: 'birth_date', type: 'date' })
  birthDate!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => Account, (account) => account.person)
  accounts?: Account[];
}
