import { DataSource } from 'typeorm';
import * as config from '.';
import { NamingStrategy } from '../utils/AliasNamingStrategy';
import { join } from 'path';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: config.DATABASE_HOST,
  port: config.DATABASE_PORT,
  username: config.DATABASE_USERNAME,
  password: config.DATABASE_PASSWORD,
  database: config.DATABASE_NAME,
  synchronize: false,
  logging: false,
  entities: [join(__dirname, '..', '/entity/**/model{.js,.ts}')],
  migrations: [join(__dirname, '..', '/migrations/*{.js,.ts}')],
  namingStrategy: new NamingStrategy(),
  migrationsRun: true,
});
