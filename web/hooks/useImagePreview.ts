"use client";

/**
 * Génère une URL de prévisualisation (object URL) pour un fichier image, et
 * la révoque automatiquement lorsque le fichier change ou que le composant
 * se démonte, afin d'éviter les fuites mémoire.
 */

import { useEffect, useMemo } from "react";

export function useImagePreview(file: File | null): string | null {
  // Dérivation pure : l'URL est recalculée uniquement quand `file` change.
  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file]
  );

  // L'effet ne sert qu'au nettoyage (aucun setState ici).
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return previewUrl;
}
