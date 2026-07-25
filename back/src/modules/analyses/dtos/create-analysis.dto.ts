import { AnalysisImageSource } from '../entities/analysis-image.entity';
import { AnalysisResult } from '../entities/analysis.entity';

/**
 * One entry per uploaded file, matched by array index. Sent as a JSON string
 * in the `results` multipart field alongside the `images` files.
 *
 * - `source: "mobile"` images arrive already classified on-device and must
 *   include `result` (+ optional `confidence`).
 * - `source: "upload"` (or an omitted entry) means the image still needs
 *   server-side classification.
 */
export interface AnalysisImageMeta {
  source: AnalysisImageSource;
  result?: AnalysisResult;
  confidence?: number;
}
