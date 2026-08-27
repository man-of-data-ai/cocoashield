export class Constants {
  /**
   * Environment stages.
   */
  static ENVIRONMENT = {
    PRODUCTION: 'production',
    STAGING: 'staging',
    DEVELOPMENT: 'development',
    TEST: 'test',
  };

  /**
   * Versions de l'API. Chaque chemin de `src/routes.ts` porte la sienne :
   * ajouter une V2 n'oblige pas à toucher aux routes existantes.
   */
  static API = {
    V1: 'v1',
  };
}
