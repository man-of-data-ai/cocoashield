import { IsEnum, IsNumber, IsString, IsUrl } from 'class-validator';

export enum Environment {
  PRODUCTION = 'production',
  STAGING = 'staging',
  DEVELOPMENT = 'development',
  TEST = 'test',
}

export class ConfigSchema {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.DEVELOPMENT;

  @IsString()
  APP_NAME: string;

  @IsNumber()
  PORT: number = 3000;

  // Database
  @IsString()
  DB_HOST: string;

  @IsNumber()
  DB_PORT: number = 5432;

  @IsString()
  DB_NAME: string;

  @IsString()
  DB_USERNAME: string;

  @IsString()
  DB_PASSWORD: string;

  // Better Auth
  @IsString()
  BETTER_AUTH_SECRET: string;

  @IsUrl({ require_tld: false })
  BETTER_AUTH_URL: string;
}
