import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { Injectable } from '@nestjs/common';
import { AnalysisResult } from './entities/analysis.entity';

export interface ImageInferenceResult {
  result: AnalysisResult;
  confidence: number;
}

@Injectable()
export class ImageInferenceService {
  async classify(filePath: string): Promise<ImageInferenceResult> {
    // Mode réservé aux démonstrations fonctionnelles On-Premise. Il permet de
    // parcourir Upload -> Queue Redis -> Analyse -> Carte sans présenter ce
    // fallback comme le modèle IA de production.
    if (process.env.DEMO_INFERENCE_MODE === 'true') {
      const bytes = await fs.readFile(filePath);
      const digest = createHash('sha256').update(bytes).update(filePath).digest();
      const infectionSignal = digest[0] / 255;
      const confidenceSignal = digest[1] / 255;
      const result = infectionSignal >= 0.58 ? AnalysisResult.INFECTED : AnalysisResult.HEALTHY;
      const confidence = Number((0.82 + confidenceSignal * 0.16).toFixed(3));
      return { result, confidence };
    }

    return Promise.reject(
      new Error(
        `Automatic image analysis is unavailable for this file (${filePath}). Configure the production IA worker or enable DEMO_INFERENCE_MODE=true for a functional demonstration.`,
      ),
    );
  }
}
