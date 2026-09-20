import * as dotenv from 'dotenv';
import { betterAuth } from 'better-auth';
import { username } from 'better-auth/plugins';
import { Pool } from 'pg';
import { routes } from '../routes';

dotenv.config();

// Standalone Better Auth instance used only by the `@better-auth/cli`
// (`npm run auth:generate` / `npm run auth:migrate`) to introspect the
// schema and run migrations. The NestJS app itself builds its own instance
// from ConfigService, see src/modules/auth/auth.provider.ts.
export const auth = betterAuth({
  database: new Pool({
    connectionString: `postgresql://${process.env.DATABASE_USERNAME}:${process.env.DATABASE_PASSWORD}@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}/${process.env.DATABASE_NAME}`,
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  basePath: routes.betterAuthBasePath,
  trustedOrigins: [process.env.WEB_URL ?? 'http://localhost:3002'],
  emailAndPassword: {
    enabled: true,
  },
  plugins: [username()],
});
