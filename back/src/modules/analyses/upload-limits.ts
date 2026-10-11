import { BadRequestException } from '@nestjs/common';
import type { Options } from 'multer';

/**
 * Seuils d'envoi des photos d'analyse. Le web les lit sur
 * `GET /v1/analyses/upload-limits` pour refuser un fichier avant l'envoi et
 * découper un grand lot en plusieurs requêtes : aucune limite ne doit se
 * découvrir sous la forme d'une erreur du serveur.
 */
export const UPLOAD_LIMITS = {
  // Une photo de drone pleine résolution dépasse rarement 30 Mo.
  maxImageSizeBytes: 50 * 1024 * 1024,
  maxImagesPerRequest: 50,
  // Sous le `request_body max_size 100MB` de Caddy et le
  // `proxyClientMaxBodySize` de Next (voir web/next.config.ts).
  maxRequestBytes: 90 * 1024 * 1024,
  // Formats que sharp décode pour l'inférence ; le HEIC n'y est pas.
  acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'],
} as const;

export const imageUploadOptions: Pick<Options, 'limits' | 'fileFilter'> = {
  limits: {
    fileSize: UPLOAD_LIMITS.maxImageSizeBytes,
    files: UPLOAD_LIMITS.maxImagesPerRequest,
  },
  fileFilter: (_req, file, callback) => {
    if (
      (UPLOAD_LIMITS.acceptedMimeTypes as readonly string[]).includes(
        file.mimetype,
      )
    ) {
      callback(null, true);
      return;
    }
    callback(
      new BadRequestException(
        `Format non pris en charge pour « ${file.originalname} » : JPEG, PNG, WebP ou TIFF attendu.`,
      ),
    );
  },
};
