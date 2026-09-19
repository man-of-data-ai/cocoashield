import { Injectable, Logger } from '@nestjs/common';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import { ConfigService } from '../../libs/infrastructure/config/config.service';
import { AnalysisResult } from './entities/analysis.entity';

export interface ImageInferenceResult {
  result: AnalysisResult;
  confidence: number;
  modelVersion: string;
}

const IMG_SIZE = 260;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

export function verdictFromLogit(logitHealthy: number): {
  result: AnalysisResult;
  confidence: number;
} {
  const probHealthy = 1 / (1 + Math.exp(-logitHealthy));
  const isInfected = probHealthy <= 0.5;
  return {
    result: isInfected ? AnalysisResult.INFECTED : AnalysisResult.HEALTHY,
    confidence: isInfected ? 1 - probHealthy : probHealthy,
  };
}

@Injectable()
export class ImageInferenceService {
  private readonly logger = new Logger(ImageInferenceService.name);
  private sessionPromise: Promise<ort.InferenceSession> | null = null;

  constructor(private readonly config: ConfigService) {}

  private getSession(): Promise<ort.InferenceSession> {
    const loaded = this.sessionPromise;
    if (loaded) return loaded;

    const modelPath = this.config.modelPath;
    this.logger.log(`Loading ONNX model from ${modelPath}`);
    const session = ort.InferenceSession.create(modelPath).catch(
      (error: Error) => {
        this.sessionPromise = null;
        throw error;
      },
    );
    this.sessionPromise = session;
    return session;
  }

  private async preprocess(filePath: string): Promise<ort.Tensor> {
    const { data } = await sharp(filePath)
      .resize(IMG_SIZE, IMG_SIZE, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

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

    return {
      ...verdictFromLogit(logitHealthy),
      modelVersion: this.config.modelVersion,
    };
  }
}
