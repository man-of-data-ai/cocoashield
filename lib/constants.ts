/**
 * Constantes centralisées de l'application.
 * Toute valeur de configuration partagée doit vivre ici plutôt que d'être
 * dupliquée / codée en dur dans les composants ou services.
 */

/** Nom du cookie httpOnly utilisé pour stocker le jeton de session. */
export const SESSION_COOKIE_NAME = "session_token";

/** Durée de vie de la session, en secondes (8 heures). */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

/** Types MIME d'images acceptés pour l'upload de feuille cadastrale. */
export const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

/** Taille maximale d'un fichier uploadé, en octets (10 Mo). */
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

/** Rayon moyen de la Terre, en mètres (utilisé pour les calculs géodésiques). */
export const EARTH_RADIUS_METERS = 6_371_000;

/** Position par défaut de la carte lorsqu'aucune parcelle n'est chargée. */
export const DEFAULT_MAP_CENTER: [number, number] = [33.5731, -7.5898];
export const DEFAULT_MAP_ZOOM = 6;
