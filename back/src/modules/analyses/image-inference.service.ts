import { Injectable } from '@nestjs/common';
import { AnalysisResult } from './entities/analysis.entity';

export interface ImageInferenceResult {
  result: AnalysisResult;
  confidence: number;
}


@Injectable()
export class ImageInferenceService {
  classify(filePath: string): Promise<ImageInferenceResult> {
    return Promise.reject(
      new Error(
        `Automatic image analysis is unavailable for this file (${filePath})`,
      ),
    );
  }
}
