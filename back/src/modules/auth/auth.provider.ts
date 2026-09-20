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
    trustedOrigins: [config.webUrl],
    emailAndPassword: {
      enabled: true,
    },
    plugins: [username()],

    advanced: {
      database: {
        // Identifiants UUID pour les tables gérées par better-auth
        // (`user`, `session`, `account`, `verification`), comme pour les
        // entités applicatives : un identifiant énumérable facilite le
        // balayage horizontal des ressources d'autrui. La génération est
        // déléguée à PostgreSQL, qui fournit le DEFAULT posé par la migration
        // 20260827_better_auth_id_defaults.sql.
        generateId: 'uuid',
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
