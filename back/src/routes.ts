/**
 * Routes de l'API, regroupées en un seul fichier.
 *
 * Chaque domaine déclare une constante racine locale, puis un objet de
 * chemins **complets depuis la racine de l'API**. La version n'est pas
 * répétée ici : elle est portée par le préfixe des contrôleurs
 * (`@Controller(Constants.API.VERSION)`).
 */
import { Constants } from './core/constants/constants';

const auth_root = 'auth';
const user_root = 'users';
const parcel_root = 'parcels';
const analysis_root = 'analyses';
const analysis_image_root = 'analyses-images';
const mission_root = 'missions';
const export_root = 'exports';
const audit_root = 'audit';
const configuration_root = 'configuration';
const drone_profile_root = `${configuration_root}/drone-profiles`;

export const auth_routes = {
  /**
   * better-auth monte ses propres endpoints (sign-in, sign-up, session, ...)
   * en middleware et revendique tout ce préfixe : rien d'autre ne peut y être
   * routé. L'inscription vit donc sous `users`.
   */
  base_path: `/${Constants.API.VERSION}/${auth_root}`,
  register: `${user_root}/register`,
};

export const user_routes = {
  root: `${user_root}`,
  details: `${user_root}/:id`,
  restore: `${user_root}/:id/restore`,
  profile: `${user_root}/:id/profile`,
  me_profile: `${user_root}/me/profile`,
};

export const parcel_routes = {
  root: `${parcel_root}`,
  details: `${parcel_root}/:id`,
  restore: `${parcel_root}/:id/restore`,
  verification: `${parcel_root}/:id/verification`,
  analyses: `${parcel_root}/:id/analyses`,
};

export const analysis_routes = {
  root: `${analysis_root}`,
  details: `${analysis_root}/:id`,
  restore: `${analysis_root}/:id/restore`,
};

export const analysis_image_routes = {
  file: `${analysis_image_root}/:id/file`,
};

export const mission_routes = {
  root: `${mission_root}`,
  details: `${mission_root}/:id`,
  restore: `${mission_root}/:id/restore`,
};

export const export_routes = {
  root: `${export_root}`,
  generate: `${export_root}/generate`,
};

export const audit_routes = {
  root: `${audit_root}`,
  facets: `${audit_root}/facets`,
};

export const configuration_routes = {
  root: `${configuration_root}`,
  settings: `${configuration_root}/settings`,
};

export const drone_profile_routes = {
  root: `${drone_profile_root}`,
  details: `${drone_profile_root}/:id`,
  restore: `${drone_profile_root}/:id/restore`,
};
