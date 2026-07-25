import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as path from 'path';
import { ConfigService } from '../../libs/infrastructure/config/config.service';
import { AnalysesService } from './analyses.service';
import { IMAGE_INFERENCE_QUEUE, ImageInferenceJob } from './analyses.constants';
import { AnalysisImageStatus } from './entities/analysis-image.entity';
import { ImageInferenceService } from './image-inference.service';
import { AnalysisImageRepository } from './repositories/analysis-image.repository';

@Processor(IMAGE_INFERENCE_QUEUE)
export class ImageInferenceProcessor extends WorkerHost {
  private readonly logger = new Logger(ImageInferenceProcessor.name);

  constructor(
    private readonly analysisImageRepository: AnalysisImageRepository,
    private readonly imageInferenceService: ImageInferenceService,
    private readonly analysesService: AnalysesService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job<ImageInferenceJob>): Promise<void> {
    const { analysisImageId } = job.data;
    const image = await this.analysisImageRepository.findById(analysisImageId);
    if (!image) {
      this.logger.warn(
        `AnalysisImage ${analysisImageId} no longer exists, skipping`,
      );
      return;
    }

    try {
      const filePath = path.join(this.configService.uploadsDir, image.filePath);
      const { result, confidence } =
        await this.imageInferenceService.classify(filePath);

      await this.analysisImageRepository.update(image.id, {
        status: AnalysisImageStatus.PROCESSED,
        result,
        confidence,
      });
    } catch (error) {
      this.logger.error(
        `Inference failed for AnalysisImage ${image.id}: ${(error as Error).message}`,
      );
      await this.analysisImageRepository.update(image.id, {
        status: AnalysisImageStatus.FAILED,
      });
    }

    await this.analysesService.finalizeIfDone(image.analysisId);
  }
}
