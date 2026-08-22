/**
 * Classification de sévérité — source de vérité unique.
 *
 * Les seuils ne sont pas des constantes : ils viennent de `platform_settings`
 * et sont modifiables par l'écran de configuration. Le front n'applique pas
 * sa propre grille, il affiche le niveau calculé ici et renvoyé par l'API.
 */
export enum SeverityLevel {
  FAIBLE = 'faible',
  MODERE = 'modere',
  ELEVE = 'eleve',
  CRITIQUE = 'critique',
}

/** Seuils exprimés en taux d'infection (0 → 1). */
export type SeverityThresholds = {
  moderate: number;
  high: number;
  critical: number;
};

export function classifySeverity(
  infectionRate: number,
  thresholds: SeverityThresholds,
): SeverityLevel {
  if (infectionRate >= thresholds.critical) return SeverityLevel.CRITIQUE;
  if (infectionRate >= thresholds.high) return SeverityLevel.ELEVE;
  if (infectionRate >= thresholds.moderate) return SeverityLevel.MODERE;
  return SeverityLevel.FAIBLE;
}
