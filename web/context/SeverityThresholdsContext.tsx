"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  FALLBACK_SEVERITY_THRESHOLDS,
  type SeverityThresholds,
} from "@/lib/severity";
import { configurationService } from "@/services/configuration-service";

type SeverityThresholdsContextValue = {
  thresholds: SeverityThresholds;
  refresh: () => Promise<void>;
};

const SeverityThresholdsContext =
  createContext<SeverityThresholdsContextValue | null>(null);

/**
 * Diffuse les seuils de sévérité configurés côté serveur.
 *
 * Remplace la variable de module mutable qui servait auparavant d'état
 * global : celle-ci rendait le rendu dépendant de l'ordre des imports et
 * ne déclenchait aucun re-rendu quand la configuration changeait.
 */
export function SeverityThresholdsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [thresholds, setThresholds] = useState<SeverityThresholds>(
    FALLBACK_SEVERITY_THRESHOLDS,
  );

  const fetchThresholds = useCallback(
    () =>
      configurationService.getSettings().then(
        (settings) => ({
          modere: settings.severityModerate,
          eleve: settings.severityHigh,
          critique: settings.severityCritical,
        }),
        // Les seuils de repli restent valables : l'affichage ne doit pas
        // échouer parce que la configuration n'est pas lisible (rôle sans
        // accès à l'écran de configuration, par exemple).
        () => FALLBACK_SEVERITY_THRESHOLDS,
      ),
    [],
  );

  const refresh = useCallback(
    () => fetchThresholds().then(setThresholds),
    [fetchThresholds],
  );

  useEffect(() => {
    let isMounted = true;
    fetchThresholds().then((next) => {
      if (isMounted) setThresholds(next);
    });
    return () => {
      isMounted = false;
    };
  }, [fetchThresholds]);

  const value = useMemo(() => ({ thresholds, refresh }), [thresholds, refresh]);

  return (
    <SeverityThresholdsContext.Provider value={value}>
      {children}
    </SeverityThresholdsContext.Provider>
  );
}

export function useSeverityThresholds(): SeverityThresholdsContextValue {
  const context = useContext(SeverityThresholdsContext);
  if (!context) {
    throw new Error(
      "useSeverityThresholds doit être utilisé dans un SeverityThresholdsProvider.",
    );
  }
  return context;
}
