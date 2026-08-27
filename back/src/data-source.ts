import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config();

/**
 * Standalone DataSource for the TypeORM CLI (schema:log, migration tooling).
 * The NestJS app builds its own connection from ConfigService — keep the two
 * in sync when connection options change.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: +(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
});
