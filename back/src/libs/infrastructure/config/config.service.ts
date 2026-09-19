import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { ConfigSchema, Environment } from './config.schema';
import { validate } from './env-validations';

@Injectable()
export class ConfigService {
  private envConfig: ConfigSchema = {
    NODE_ENV: (process.env.NODE_ENV as Environment) ?? Environment.DEVELOPMENT,
  } as ConfigSchema;

  loadConfig(): void {
    if (
      process.env.NODE_ENV === Environment.DEVELOPMENT ||
      !process.env.NODE_ENV
    ) {
      const config = fs.existsSync('.env')
        ? dotenv.parse(fs.readFileSync('.env'))
        : {};
      this.envConfig = validate(
        { ...this.envConfig, ...config, ...process.env },
        ConfigSchema,
      );
      return;
    }

    this.envConfig = validate(
      { ...this.envConfig, ...process.env },
      ConfigSchema,
    );
  }

  get nodeEnv(): Environment {
    return this.envConfig.NODE_ENV;
  }

  get appName(): string {
    return this.envConfig.APP_NAME;
  }

  get port(): number {
    return +this.envConfig.PORT;
  }

  get typeOrmConfig(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: this.envConfig.DATABASE_HOST,
      port: +this.envConfig.DATABASE_PORT,
      username: this.envConfig.DATABASE_USERNAME,
      password: this.envConfig.DATABASE_PASSWORD,
      database: this.envConfig.DATABASE_NAME,
      autoLoadEntities: true,
      synchronize: this.nodeEnv !== Environment.PRODUCTION,
      logging: this.nodeEnv === Environment.DEVELOPMENT,
    };
  }

  get databaseUrl(): string {
    const { DATABASE_USERNAME, DATABASE_PASSWORD, DATABASE_HOST, DATABASE_PORT, DATABASE_NAME } =
      this.envConfig;
    return `postgresql://${DATABASE_USERNAME}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}`;
  }

  get betterAuthSecret(): string {
    return this.envConfig.BETTER_AUTH_SECRET;
  }

  get betterAuthUrl(): string {
    return this.envConfig.BETTER_AUTH_URL;
  }

  get webUrl(): string {
    return this.envConfig.WEB_URL;
  }

  get mobileAppScheme(): string {
    return this.envConfig.MOBILE_APP_SCHEME;
  }

  get redisConnection(): { host: string; port: number } {
    return {
      host: this.envConfig.REDIS_HOST,
      port: +this.envConfig.REDIS_PORT,
    };
  }

  get uploadsDir(): string {
    return this.envConfig.UPLOADS_DIR;
  }

  get isProduction(): boolean {
    return this.nodeEnv === Environment.PRODUCTION;
  }

  get modelPath(): string {
    return this.envConfig.MODEL_PATH;
  }

  get modelVersion(): string {
    return this.envConfig.MODEL_VERSION;
  }
}
