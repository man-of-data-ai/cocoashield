/**
 * Point d'entrée de l'instance better-auth pour la CLI (`auth:generate`,
 * `auth:migrate`).
 *
 * La CLI cherche un fichier `auth.ts` à des emplacements conventionnels et lit
 * l'objet exporté sous le nom `auth`. Sans ce fichier, elle retombe sur une
 * configuration par défaut : les migrations générées ignorent alors les
 * plugins et les options `advanced` — dont `generateId: 'uuid'` — et créent un
 * schéma qui ne correspond pas à celui utilisé à l'exécution.
 *
 * La configuration est lue directement depuis `process.env` : la CLI charge ce
 * fichier hors du contexte Nest, sans la transformation des décorateurs dont
 * dépend `ConfigService`. C'est bien la même fonction `createAuth` que celle
 * utilisée par l'application, donc la même configuration des deux côtés.
 */
import { createAuth } from './modules/auth/auth.provider';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
  return value;
}

export const auth = createAuth({
  databaseUrl: `postgresql://${required('DB_USERNAME')}:${required('DB_PASSWORD')}@${required('DB_HOST')}:${process.env.DB_PORT ?? '5432'}/${required('DB_NAME')}`,
  betterAuthSecret: required('BETTER_AUTH_SECRET'),
  betterAuthUrl: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  webUrl: process.env.WEB_URL ?? 'http://localhost:3002',
  isProduction: process.env.NODE_ENV === 'production',
});
