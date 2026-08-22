import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { username } from 'better-auth/plugins';
import { Pool } from 'pg';
import { routes } from '../../routes';

/**
 * Configuration nécessaire à better-auth.
 *
 * Décrite en type structurel plutôt qu'en dépendance au `ConfigService` :
 * l'application le satisfait tel quel, et la CLI better-auth — qui charge ce
 * fichier hors du contexte Nest, sans le transformateur de décorateurs — peut
 * en construire un depuis `process.env`.
 */
export type AuthConfig = {
  databaseUrl: string;
  betterAuthSecret: string;
  betterAuthUrl: string;
  webUrl: string;
  isProduction: boolean;
};

/** Durée de vie du cache JWT en cookie, en secondes. */
const SESSION_COOKIE_CACHE_SECONDS = 5 * 60;

/** Durée de vie d'une session, en secondes. */
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export function createAuth(config: AuthConfig) {
  const pool = new Pool({ connectionString: config.databaseUrl });
  const isProduction = config.isProduction;

  return betterAuth({
    database: pool,
    secret: config.betterAuthSecret,
    baseURL: config.betterAuthUrl,
    basePath: routes.betterAuthBasePath,
    trustedOrigins: [config.webUrl],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
    },
    plugins: [username()],

    advanced: {
      database: {
        // Identifiants UUID pour les tables gérées par better-auth
        // (`user`, `session`, `account`, `verification`), comme pour les
        // entités applicatives : un identifiant énumérable facilite le
        // balayage horizontal des ressources d'autrui.
        generateId: 'uuid',
      },
      cookies: {
        sessionToken: {
          attributes: {
            httpOnly: true,
            sameSite: 'lax',
            secure: isProduction,
            path: '/',
          },
        },
      },
      useSecureCookies: isProduction,
    },

    session: {
      expiresIn: SESSION_MAX_AGE_SECONDS,
      /**
       * Cookie de session signé (JWT) contenant l'utilisateur et sa session :
       * la majorité des requêtes est authentifiée sans aller en base.
       *
       * La table `session` reste la source de vérité : sans elle, aucune
       * révocation ne serait possible et un compte supprimé resterait
       * utilisable jusqu'à l'expiration de son jeton. Le cache est court
       * (5 min) pour borner cette fenêtre.
       */
      cookieCache: {
        enabled: true,
        maxAge: SESSION_COOKIE_CACHE_SECONDS,
      },
    },

    databaseHooks: {
      session: {
        create: {
          /**
           * Refuse la création d'une session pour un compte supprimé, quelle
           * que soit la voie d'authentification. Le contrôle vit ici plutôt
           * que dans la route de connexion pour qu'aucun futur fournisseur
           * d'identité ne le contourne.
           */
          before: async (session: { userId: string }) => {
            const { rows } = await pool.query<{ deleted_at: Date | null }>(
              `SELECT deleted_at FROM app_user_profile WHERE user_id = $1 LIMIT 1`,
              [session.userId],
            );
            if (rows[0]?.deleted_at) {
              // `APIError` produit une réponse HTTP propre ; une `Error` nue
              // remonterait en 500 et masquerait la raison du refus.
              throw new APIError('FORBIDDEN', {
                message: 'Ce compte a été supprimé.',
              });
            }
            return { data: session };
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
