import { betterAuth } from 'better-auth';
import { username } from 'better-auth/plugins';
import { Pool } from 'pg';
import { ConfigService } from '../../libs/infrastructure/config/config.service';
import { routes } from '../../routes';

export function createAuth(config: ConfigService) {
  return betterAuth({
    database: new Pool({ connectionString: config.databaseUrl }),
    secret: config.betterAuthSecret,
    baseURL: config.betterAuthUrl,
    basePath: routes.betterAuthBasePath,
    emailAndPassword: {
      enabled: true,
    },
    plugins: [username()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
