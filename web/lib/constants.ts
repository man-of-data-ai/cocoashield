/**
 * Constantes centralisées de l'application.
 * Toute valeur de configuration partagée doit vivre ici plutôt que d'être
 * dupliquée / codée en dur dans les composants ou services.
 */

/** Rayon moyen de la Terre, en mètres (utilisé pour les calculs géodésiques). */
export const EARTH_RADIUS_METERS = 6_371_000;

/** Position par défaut de la carte lorsqu'aucune parcelle n'est chargée (Côte d'Ivoire). */
export const DEFAULT_MAP_CENTER: [number, number] = [5.35, -4.02];
export const DEFAULT_MAP_ZOOM = 8;
