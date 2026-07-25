import { Injectable } from '@nestjs/common';
import { AnalysisResult } from './entities/analysis.entity';

export interface ImageInferenceResult {
  result: AnalysisResult;
  confidence: number;
}

/**
 * Server-side classification for images that didn't already come
 * pre-classified from the mobile app (source=upload).
 *
 * Phase 2 TODO: run `model/v3/cocoashield_v3.onnx` via onnxruntime-node,
 * preprocessing the image to 260x260 per `model/v3/RESULTATS.md`. For now
 * this is a stub so the BullMQ queue/processor plumbing can be exercised
 * end-to-end; it always fails, which is surfaced as AnalysisImage FAILED.
 */
@Injectable()
export class ImageInferenceService {
  classify(filePath: string): Promise<ImageInferenceResult> {
    return Promise.reject(
      new Error(
        `Server-side image inference is not implemented yet (${filePath})`,
      ),
    );
  }
}
