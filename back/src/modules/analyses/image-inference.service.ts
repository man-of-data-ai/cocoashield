import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../libs/infrastructure/config/config.service';
import { AnalysisResult } from './entities/analysis.entity';

export interface ImageInferenceResult {
  result: AnalysisResult;
  confidence: number;
}

@Injectable()
export class ImageInferenceService {
  constructor(private readonly config: ConfigService) {
    // Échouer au démarrage plutôt qu'analyse par analyse : le mode démo rend
    // un verdict fabriqué avec une confiance plausible, indistinguable d'une
    // vraie prédiction pour qui lit la carte. Hors démonstration, l'absence
    // de modèle doit rester une panne visible, pas un faux diagnostic.
    if (this.config.isProduction && this.config.demoInferenceMode) {
      throw new Error(
        'DEMO_INFERENCE_MODE ne peut pas être activé en production : il produit ' +
          "des diagnostics phytosanitaires fabriqués. Connecter le modèle d'inférence.",
      );
    }
  }

  async classify(filePath: string): Promise<ImageInferenceResult> {
    // Mode réservé aux démonstrations fonctionnelles On-Premise. Il permet de
    // parcourir Upload -> Queue Redis -> Analyse -> Carte sans présenter ce
    // fallback comme le modèle IA de production.
    if (this.config.demoInferenceMode) {
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
