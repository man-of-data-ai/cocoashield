import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import * as path from 'path';
import { ConfigService } from '../../libs/infrastructure/config/config.service';
import { MissionsService } from '../missions/missions.service';
import { ParcelStatus } from '../parcels/entities/parcel.entity';
import { ParcelsService } from '../parcels/parcels.service';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { IMAGE_INFERENCE_QUEUE, ImageInferenceJob } from './analyses.constants';
import { AnalysisImageMeta } from './dtos/create-analysis.dto';
import {
  AnalysisImage,
  AnalysisImageSource,
  AnalysisImageStatus,
  GeolocationQuality,
} from './entities/analysis-image.entity';
import {
  Analysis,
  AnalysisResult,
  AnalysisStatus,
} from './entities/analysis.entity';
import { ImageGeoService } from './image-geo.service';
import { AnalysisImageRepository } from './repositories/analysis-image.repository';
import { AnalysisRepository } from './repositories/analysis.repository';

@Injectable()
export class AnalysesService {
  constructor(
    private readonly analysisRepository: AnalysisRepository,
    private readonly analysisImageRepository: AnalysisImageRepository,
    private readonly parcelsService: ParcelsService,
    private readonly imageGeoService: ImageGeoService,
    private readonly configService: ConfigService,
    private readonly missionsService: MissionsService,
    private readonly platformConfigService: PlatformConfigService,
    @InjectQueue(IMAGE_INFERENCE_QUEUE)
    private readonly imageInferenceQueue: Queue<ImageInferenceJob>,
  ) {}

  async create(
    parcelId: string,
    ownerId: string,
    files: Express.Multer.File[],
    imageMetas: AnalysisImageMeta[],
    missionId?: string,
    missionName?: string,
    profileId?: string,
  ): Promise<Analysis> {
    if (files.length === 0) {
      throw new BadRequestException('At least one image is required');
    }
    if (imageMetas.length !== 0 && imageMetas.length !== files.length) {
      throw new BadRequestException(
        'results must either be omitted or match the number of images',
      );
    }

    // Ownership check - throws NotFoundException if the parcel is not owned by the caller.
    await this.parcelsService.findOneForOwner(parcelId, ownerId);

    if (profileId) {
      await this.platformConfigService.getActiveDroneProfile(
        ownerId,
        profileId,
      );
    }

    const mission = await this.missionsService.resolve(
      ownerId,
      missionId,
      missionName,
    );

    const analysis = await this.analysisRepository.create({
      parcelId,
      status: AnalysisStatus.PENDING,
      missionId: mission?.id ?? null,
      profileId: profileId ?? null,
    });

    let hasPendingImage = false;

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const meta = imageMetas[index];
      const isPreClassified =
        meta?.source === AnalysisImageSource.MOBILE && meta.result;
      const gps = await this.imageGeoService.extractGps(file.path);

      const geolocationQuality = gps
        ? GeolocationQuality.PRECISE
        : GeolocationQuality.NONE;

      const image = await this.analysisImageRepository.create({
        analysisId: analysis.id,
        filePath: path.basename(file.path),
        source: meta?.source ?? AnalysisImageSource.UPLOAD,
        status: isPreClassified
          ? AnalysisImageStatus.PROCESSED
          : AnalysisImageStatus.PENDING,
        result: isPreClassified ? meta.result! : null,
        confidence: isPreClassified ? (meta.confidence ?? null) : null,
        latitude: gps?.latitude ?? null,
        longitude: gps?.longitude ?? null,
        geolocationQuality,
      });

      if (!isPreClassified) {
        hasPendingImage = true;
        await this.imageInferenceQueue.add('classify', {
          analysisImageId: image.id,
        });
      }
    }

    await this.parcelsService.updateStatus(parcelId, ParcelStatus.ANALYZING);
    await this.analysisRepository.update(analysis.id, {
      status: hasPendingImage
        ? AnalysisStatus.PROCESSING
        : AnalysisStatus.PENDING,
    });

    if (!hasPendingImage) {
      await this.finalizeIfDone(analysis.id);
    }

    return this.findOne(analysis.id);
  }

  async findOne(id: string): Promise<Analysis> {
    const analysis = await this.analysisRepository.findById(id);
    if (!analysis) {
      throw new NotFoundException('Analysis not found');
    }
    return analysis;
  }

  async findOneForOwner(id: string, ownerId: string): Promise<Analysis> {
    const analysis = await this.findOne(id);
    if (analysis.parcel.ownerId !== ownerId) {
      throw new NotFoundException('Analysis not found');
    }
    return analysis;
  }

  async updateNotes(
    id: string,
    ownerId: string,
    notes: string,
  ): Promise<Analysis> {
    await this.findOneForOwner(id, ownerId);
    await this.analysisRepository.update(id, { notes });
    return this.findOne(id);
  }

  /**
   * Resolves an AnalysisImage's absolute file path on disk, after checking
   * that it belongs (via analysis -> parcel) to the caller.
   */
  async getImageFilePathForOwner(
    imageId: string,
    ownerId: string,
  ): Promise<{ absolutePath: string; filename: string }> {
    const image = await this.analysisImageRepository.findByIdWithOwner(imageId);
    if (!image || image.analysis.parcel.ownerId !== ownerId) {
      throw new NotFoundException('Image not found');
    }

    return {
      absolutePath: path.join(this.configService.uploadsDir, image.filePath),
      filename: image.filePath,
    };
  }

  /** Called by the ImageInferenceProcessor after each image is processed. */
  async finalizeIfDone(analysisId: string): Promise<void> {
    const analysis = await this.findOne(analysisId);

    const stillPending = analysis.images.some(
      (image: AnalysisImage) => image.status === AnalysisImageStatus.PENDING,
    );
    if (stillPending) {
      return;
    }

    const processed = analysis.images.filter(
      (image: AnalysisImage) =>
        image.status === AnalysisImageStatus.PROCESSED && image.result !== null,
    );
    const infected = processed.filter(
      (image: AnalysisImage) => image.result === AnalysisResult.INFECTED,
    );
    const infectionPercentage =
      processed.length > 0 ? (infected.length / processed.length) * 100 : 0;
    const severityLevel: 'faible' | 'modere' | 'eleve' | 'critique' =
      infectionPercentage >= 40
        ? 'critique'
        : infectionPercentage >= 25
          ? 'eleve'
          : infectionPercentage >= 10
            ? 'modere'
            : 'faible';
    const affectedZones = infected
      .filter((image) => image.latitude !== null && image.longitude !== null)
      .map((image) => ({
        latitude: image.latitude!,
        longitude: image.longitude!,
        severity: Math.max(0.15, Math.min(1, infectionPercentage / 100)),
        severityLevel: severityLevel,
      }));
    const isInfected = infected.length > 0;
    const completedAt = new Date();

    await this.analysisRepository.update(analysisId, {
      status: AnalysisStatus.COMPLETED,
      result: isInfected ? AnalysisResult.INFECTED : AnalysisResult.HEALTHY,
      completedAt,
      infectionPercentage,
      severityLevel,
      affectedZones,
      reportGeneratedAt: completedAt,
    });

    await this.parcelsService.updateStatus(
      analysis.parcelId,
      isInfected ? ParcelStatus.SICK : ParcelStatus.HEALTHY,
    );
  }
}
