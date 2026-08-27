import { Injectable, Logger } from '@nestjs/common';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import { ConfigService } from '../../core/config/services/config.service';
import { AnalysisResult } from './entities/analysis.entity';

export interface ImageInferenceResult {
  result: AnalysisResult;
  confidence: number;
  modelVersion: string;
}

const IMG_SIZE = 260;
// Normalisation ImageNet — même contrat que le pipeline natif de
// react-native-executorch utilisé par l'app mobile (timm mobilenetv3_large_100).
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

/**
 * Classification côté serveur des images non pré-classifiées (source=upload),
 * via le modèle ONNX v3. Sortie du modèle : logit brut [1,1] où
 * sigmoid(z) = P(healthy) — convention documentée dans
 * script/v3/export_executorch_classifier.py.
 */
@Injectable()
export class ImageInferenceService {
  private readonly logger = new Logger(ImageInferenceService.name);
  private sessionPromise: Promise<ort.InferenceSession> | null = null;

  constructor(private readonly configService: ConfigService) {}

  private getSession(): Promise<ort.InferenceSession> {
    if (!this.sessionPromise) {
      const modelPath = this.configService.modelPath;
      this.logger.log(`Loading ONNX model from ${modelPath}`);
      this.sessionPromise = ort.InferenceSession.create(modelPath).catch(
        (error: Error) => {
          // Ne pas mettre en cache un échec de chargement : nouvel essai
          // au prochain job plutôt qu'un service définitivement mort.
          this.sessionPromise = null;
          throw error;
        },
      );
    }
    return this.sessionPromise;
  }

  private async preprocess(filePath: string): Promise<ort.Tensor> {
    const { data } = await sharp(filePath)
      .resize(IMG_SIZE, IMG_SIZE, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // HWC uint8 -> CHW float32 normalisé
    const pixels = IMG_SIZE * IMG_SIZE;
    const chw = new Float32Array(3 * pixels);
    for (let i = 0; i < pixels; i += 1) {
      for (let channel = 0; channel < 3; channel += 1) {
        chw[channel * pixels + i] =
          (data[i * 3 + channel] / 255 - MEAN[channel]) / STD[channel];
      }
    }
    return new ort.Tensor('float32', chw, [1, 3, IMG_SIZE, IMG_SIZE]);
  }

  async classify(filePath: string): Promise<ImageInferenceResult> {
    const session = await this.getSession();
    const input = await this.preprocess(filePath);

    const outputs = await session.run({ [session.inputNames[0]]: input });
    const logitHealthy = Number(outputs[session.outputNames[0]].data[0]);

    const probHealthy = 1 / (1 + Math.exp(-logitHealthy));
    const probInfected = 1 - probHealthy;
    const isInfected = probInfected >= 0.5;

    return {
      result: isInfected ? AnalysisResult.INFECTED : AnalysisResult.HEALTHY,
      confidence: isInfected ? probInfected : probHealthy,
      modelVersion: this.configService.modelVersion,
    };
  }
}
