import { Provider } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
import { ConfigService } from '../../libs/infrastructure/config/config.service';
import { AUTH_INSTANCE } from './auth.constants';

function createAuth(config: ConfigService) {
  return betterAuth({
    database: new Pool({ connectionString: config.databaseUrl }),
    secret: config.betterAuthSecret,
    baseURL: config.betterAuthUrl,
    emailAndPassword: {
      enabled: true,
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

export const authProvider: Provider = {
  provide: AUTH_INSTANCE,
  inject: [ConfigService],
  useFactory: createAuth,
};
