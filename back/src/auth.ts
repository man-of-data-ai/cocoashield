/**
 * Point d'entrée de l'instance better-auth pour la CLI (`auth:generate`,
 * `auth:migrate`).
 *
 * La CLI cherche un fichier `auth.ts` à des emplacements conventionnels et lit
 * l'objet exporté sous le nom `auth`. Sans lui, elle retombe sur une
 * configuration par défaut : les migrations générées ignorent alors les
 * plugins et les options `advanced` — dont `generateId: 'uuid'` — et créent un
 * schéma qui ne correspond pas à celui utilisé à l'exécution.
 *
 * C'est bien `createAuth` et le `ConfigService` de l'application qui sont
 * réutilisés ici : une seconde définition de la configuration divergerait de
 * la première au premier changement.
 */
import { ConfigService } from './core/config/services/config.service';
import { createAuth } from './modules/auth/auth.provider';

const configService = new ConfigService();
configService.loadConfig();

export const auth = createAuth({
  databaseUrl: configService.databaseUrl,
  betterAuthSecret: configService.betterAuthSecret,
  betterAuthUrl: configService.betterAuthUrl,
  webUrl: configService.webUrl,
  isProduction: configService.isProduction,
});
