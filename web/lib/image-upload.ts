export type UploadLimits = {
  maxImageSizeBytes: number;
  maxImagesPerRequest: number;
  maxRequestBytes: number;
  acceptedMimeTypes: string[];
};

export type RejectedImage = { name: string; reason: string };

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0).replace(".", ",")} Mo`;
}

/** Écarte avant l'envoi les fichiers que le back refuserait. */
export function screenImages(files: File[], limits: UploadLimits): { accepted: File[]; rejected: RejectedImage[] } {
  const accepted: File[] = [];
  const rejected: RejectedImage[] = [];
  for (const file of files) {
    if (!limits.acceptedMimeTypes.includes(file.type)) {
      rejected.push({ name: file.name, reason: "format non pris en charge (JPEG, PNG, WebP ou TIFF)" });
    } else if (file.size > limits.maxImageSizeBytes) {
      rejected.push({ name: file.name, reason: `${formatBytes(file.size)}, au-delà de ${formatBytes(limits.maxImageSizeBytes)}` });
    } else if (file.size === 0) {
      rejected.push({ name: file.name, reason: "fichier vide" });
    } else {
      accepted.push(file);
    }
  }
  return { accepted, rejected };
}

/**
 * Découpe les photos en lots qui tiennent chacun dans une requête : il n'y a
 * pas de plafond sur le nombre total de photos d'une analyse.
 */
export function batchImages(files: File[], limits: UploadLimits): File[][] {
  // Marge pour l'enveloppe multipart (en-têtes de chaque partie, champs).
  const budget = limits.maxRequestBytes - 1024 * 1024;
  const batches: File[][] = [];
  let current: File[] = [];
  let currentBytes = 0;
  for (const file of files) {
    if (current.length > 0 && (current.length >= limits.maxImagesPerRequest || currentBytes + file.size > budget)) {
      batches.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(file);
    currentBytes += file.size;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}
