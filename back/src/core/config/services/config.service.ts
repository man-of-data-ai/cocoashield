import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import Joi from 'joi';
import { Constants } from '../../constants/constants';
import { CONFIG_SCHEMA } from '../schemas/config.schema';

export interface EnvConfig {
  [key: string]: any;
}

@Injectable()
export class ConfigService {
  /**
   * envConfig.
   */
  private envConfig: EnvConfig;

  constructor() {
    this.envConfig = { NODE_ENV: process.env.NODE_ENV };
  }

  loadConfig(): void {
    if (process.env.NODE_ENV === Constants.ENVIRONMENT.DEVELOPMENT) {
      const config = fs.existsSync('.env')
        ? dotenv.parse(fs.readFileSync('.env'))
        : {};
      this.envConfig = this.validateInput(
        { ...this.envConfig, ...config, ...process.env },
        CONFIG_SCHEMA,
      );
      return;
    }

    this.envConfig = this.validateInput(
      { ...this.envConfig, ...process.env },
      CONFIG_SCHEMA,
    );
  }

  private validateInput(
    envConfig: EnvConfig,
    schema: Joi.ObjectSchema,
  ): EnvConfig {
    const result = schema.validate(envConfig, {
      allowUnknown: true,
      stripUnknown: false,
    });
    if (result.error) {
      throw new Error(`Config validation error: ${result.error.message}`);
    }
    return result.value as EnvConfig;
  }

  /**
   * Find env key.
   *
   * @param key
   */
  public get(key: string): string {
    return this.envConfig[key] as string;
  }

  get nodeEnv(): string {
    return this.envConfig.NODE_ENV as string;
  }

  get isProduction(): boolean {
    return this.nodeEnv === Constants.ENVIRONMENT.PRODUCTION;
  }

  get appName(): string {
    return this.envConfig.APP_NAME as string;
  }

  get port(): number {
    return parseInt(this.envConfig.PORT as string, 10);
  }

  /**
   * Database.
   */
  get getDatabaseHost(): string {
    return this.envConfig.DATABASE_HOST as string;
  }

  get getDatabasePort(): number {
    return parseInt(this.envConfig.DATABASE_PORT as string, 10);
  }

  get getDatabaseName(): string {
    return this.envConfig.DATABASE_NAME as string;
  }

  get getDatabaseUserName(): string {
    return this.envConfig.DATABASE_USERNAME as string;
  }

  get getDatabasePassword(): string {
    return this.envConfig.DATABASE_PASSWORD as string;
  }

  get databaseUrl(): string {
    return `postgresql://${this.getDatabaseUserName}:${this.getDatabasePassword}@${this.getDatabaseHost}:${this.getDatabasePort}/${this.getDatabaseName}`;
  }

  get typeOrmConfig(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: this.getDatabaseHost,
      port: this.getDatabasePort,
      username: this.getDatabaseUserName,
      password: this.getDatabasePassword,
      database: this.getDatabaseName,
      autoLoadEntities: true,
      synchronize: !this.isProduction,
      logging: this.nodeEnv === Constants.ENVIRONMENT.DEVELOPMENT,
    };
  }

  /**
   * Authentication.
   */
  get betterAuthSecret(): string {
    return this.envConfig.BETTER_AUTH_SECRET as string;
  }

  get betterAuthUrl(): string {
    return this.envConfig.BETTER_AUTH_URL as string;
  }

  get webUrl(): string {
    return this.envConfig.WEB_URL as string;
  }

  /**
   * Redis / BullMQ.
   */
  get redisHost(): string {
    return this.envConfig.REDIS_HOST as string;
  }

  get redisPort(): number {
    return parseInt(this.envConfig.REDIS_PORT as string, 10);
  }

  get redisConnection(): { host: string; port: number } {
    return { host: this.redisHost, port: this.redisPort };
  }

  /**
   * Local disk storage.
   */
  get uploadsDir(): string {
    return this.envConfig.UPLOADS_DIR as string;
  }

  /**
   * Inference model (ONNX).
   */
  get modelPath(): string {
    return this.envConfig.MODEL_PATH as string;
  }

  get modelVersion(): string {
    return this.envConfig.MODEL_VERSION as string;
  }
}
