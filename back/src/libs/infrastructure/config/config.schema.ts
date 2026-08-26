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

  // The web frontend origin, trusted by better-auth for cross-origin
  // requests (it calls the backend directly in some contexts, e.g. the
  // proxy.ts session check, without going through the Next.js rewrite).
  @IsUrl({ require_tld: false })
  WEB_URL: string = 'http://localhost:3002';

  // Redis / BullMQ
  @IsString()
  REDIS_HOST: string;

  @IsNumber()
  REDIS_PORT: number = 6379;

  // Local disk storage
  @IsString()
  UPLOADS_DIR: string = './uploads';

  // Inference model (ONNX). Le défaut pointe sur l'artefact du monorepo pour
  // le développement ; en production l'image Docker fixe MODEL_PATH sur le
  // modèle téléchargé depuis la release GitHub (voir back/Dockerfile).
  @IsString()
  MODEL_PATH: string = '../model/v3/cocoashield_v3.onnx';

  @IsString()
  MODEL_VERSION: string = 'v3';
}
