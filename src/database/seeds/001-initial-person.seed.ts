import { DataSource } from 'typeorm';

import { Person } from '../../modules/persons/entities/person.entity';

export async function seedInitialPerson(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(Person);
  const existing = await repo.findOne({ where: { document: '12345678900' } });
  if (existing) return;

  const person = repo.create({
    document: '12345678900',
    fullName: 'John Doe',
    birthDate: '1990-01-15',
  });
  await repo.save(person);
}
