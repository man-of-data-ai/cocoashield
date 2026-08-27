/**
 * Routes de l'API, versionnées et regroupées en un seul fichier.
 *
 * Chaque chemin porte sa version : c'est la route elle-même qui est
 * versionnée, pas le préfixe du contrôleur. Une v2 se déclare donc à côté de
 * la v1 sans toucher aux contrôleurs existants, et deux versions d'un même
 * endpoint peuvent cohabiter le temps d'une migration.
 *
 * Les chemins sont complets depuis la racine de l'API ; les contrôleurs
 * n'ajoutent aucun préfixe.
 */
import { Constants } from './core/constants/constants';

const v1 = Constants.API.V1;

/** Préfixe un chemin de la version 1 de l'API. */
const v1_route = (path: string): string => `${v1}/${path}`;

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
  base_path: `/${v1}/${auth_root}`,
  register: v1_route(`${user_root}/register`),
};

export const user_routes = {
  root: v1_route(user_root),
  details: v1_route(`${user_root}/:id`),
  restore: v1_route(`${user_root}/:id/restore`),
  profile: v1_route(`${user_root}/:id/profile`),
  me_profile: v1_route(`${user_root}/me/profile`),
};

export const parcel_routes = {
  root: v1_route(parcel_root),
  details: v1_route(`${parcel_root}/:id`),
  restore: v1_route(`${parcel_root}/:id/restore`),
  verification: v1_route(`${parcel_root}/:id/verification`),
  analyses: v1_route(`${parcel_root}/:id/analyses`),
};

export const analysis_routes = {
  root: v1_route(analysis_root),
  details: v1_route(`${analysis_root}/:id`),
  restore: v1_route(`${analysis_root}/:id/restore`),
};

export const analysis_image_routes = {
  file: v1_route(`${analysis_image_root}/:id/file`),
};

export const mission_routes = {
  root: v1_route(mission_root),
  details: v1_route(`${mission_root}/:id`),
  restore: v1_route(`${mission_root}/:id/restore`),
};

export const export_routes = {
  root: v1_route(export_root),
  generate: v1_route(`${export_root}/generate`),
};

export const audit_routes = {
  root: v1_route(audit_root),
  facets: v1_route(`${audit_root}/facets`),
};

export const configuration_routes = {
  root: v1_route(configuration_root),
  settings: v1_route(`${configuration_root}/settings`),
};

export const drone_profile_routes = {
  root: v1_route(drone_profile_root),
  details: v1_route(`${drone_profile_root}/:id`),
  restore: v1_route(`${drone_profile_root}/:id/restore`),
};
