import { IsEnum, IsIn, IsNumber, IsString, IsUrl } from 'class-validator';

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
  DATABASE_HOST: string;

  @IsNumber()
  DATABASE_PORT: number = 5432;

  @IsString()
  DATABASE_NAME: string;

  @IsString()
  DATABASE_USERNAME: string;

  @IsString()
  DATABASE_PASSWORD: string;

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

  /**
   * Classification de démonstration : un résultat déterministe dérivé du
   * fichier, pour parcourir Upload -> Redis -> Analyse -> Carte sans modèle.
   * Refusé en production (voir ImageInferenceService) : un diagnostic
   * phytosanitaire fabriqué est plus nuisible qu'une fonctionnalité absente.
   */
  // Déclaré en chaîne et non en booléen : `enableImplicitConversion` transforme
  // toute chaîne non vide en `true`, donc une faute de frappe activerait le
  // faux classifieur sans rien signaler. `IsIn` la refuse au démarrage.
  @IsIn(['true', 'false'])
  DEMO_INFERENCE_MODE: string = 'false';
}
