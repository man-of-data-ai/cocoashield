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
   * API versioning. Porté par le préfixe des contrôleurs : chaque fichier
   * `routes.ts` de module décrit des chemins relatifs à cette version.
   */
  static API = {
    VERSION: 'v1',
  };
}
