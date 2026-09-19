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
import { ImageGeoService, resolvePosition } from './image-geo.service';
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

    // Access check: the parcel must belong to the caller's organizational scope.
    const parcel = await this.parcelsService.findOneForOwner(parcelId, ownerId);

    if (profileId) {
      await this.platformConfigService.getActiveDroneProfile(
        ownerId,
        profileId,
      );
    }

    const mission = await this.missionsService.resolve(
      ownerId,
      missionId,
    );
    if (mission?.organizationId && parcel.organizationId && mission.organizationId !== parcel.organizationId) {
      throw new BadRequestException('La mission et la parcelle doivent appartenir à la même organisation.');
    }

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
      const gps = resolvePosition(await this.imageGeoService.extractGps(file.path), meta);

      const geolocationQuality = gps?.geolocationQuality ?? GeolocationQuality.NONE;

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
        altitudeM: gps?.altitudeM ?? null,
        gimbalYaw: gps?.gimbalYaw ?? null,
        gimbalPitch: gps?.gimbalPitch ?? null,
        gimbalRoll: gps?.gimbalRoll ?? null,
        captureTimestamp: gps?.captureTimestamp ?? null,
        geolocationPrecisionM: gps?.geolocationPrecisionM ?? null,
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
    await this.parcelsService.findOneForOwner(analysis.parcelId, ownerId);
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
    if (!image) throw new NotFoundException('Image not found');
    await this.parcelsService.findOneForOwner(image.analysis.parcelId, ownerId);

    return {
      absolutePath: path.join(this.configService.uploadsDir, image.filePath),
      filename: image.filePath,
    };
  }

  /** Called by the ImageInferenceProcessor after each image is processed. */
  async finalizeIfDone(analysisId: string): Promise<void> {
    const analysis = await this.findOne(analysisId);
    const stillPending = analysis.images.some((image: AnalysisImage) => image.status === AnalysisImageStatus.PENDING);
    if (stillPending) return;

    const settings = await this.platformConfigService.getSettings(analysis.parcel.ownerId);
    const processedRaw = analysis.images.filter((image: AnalysisImage) => image.status === AnalysisImageStatus.PROCESSED && image.result !== null);
    const processed = this.deduplicate(processedRaw, settings.dedupDistanceM, settings.dedupWindowS);
    const infected = processed.filter((image) => image.result === AnalysisResult.INFECTED);
    const infectionPercentage = processed.length > 0 ? (infected.length / processed.length) * 100 : 0;
    const infectionRate = infectionPercentage / 100;
    const severityLevel = this.severityLevel(infectionRate, settings);
    const previous = (await this.analysisRepository.findCompletedByParcel(analysis.parcelId)).find((item) => item.id !== analysisId) ?? null;
    const affectedZones = this.buildZones(processed, infected, settings.clusteringRadiusM, settings.minImagesPerZone, settings, previous);
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
    await this.parcelsService.updateStatus(analysis.parcelId, isInfected ? ParcelStatus.SICK : ParcelStatus.HEALTHY);
  }

  private severityLevel(rate: number, settings: { severityModerate: number; severityHigh: number; severityCritical: number }): 'faible'|'modere'|'eleve'|'critique' {
    if (rate >= settings.severityCritical) return 'critique';
    if (rate >= settings.severityHigh) return 'eleve';
    if (rate >= settings.severityModerate) return 'modere';
    return 'faible';
  }

  private distanceM(a: { latitude: number | null; longitude: number | null }, b: { latitude: number | null; longitude: number | null }): number {
    if (a.latitude === null || a.longitude === null || b.latitude === null || b.longitude === null) return Number.POSITIVE_INFINITY;
    const toRad = (v: number) => v * Math.PI / 180;
    const dLat = toRad(b.latitude - a.latitude); const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude); const lat2 = toRad(b.latitude);
    const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
  }

  private deduplicate(images: AnalysisImage[], distanceM: number, windowS: number): AnalysisImage[] {
    const sorted = [...images].sort((a,b) => new Date(a.captureTimestamp ?? a.createdAt).getTime() - new Date(b.captureTimestamp ?? b.createdAt).getTime());
    const kept: AnalysisImage[] = [];
    for (const image of sorted) {
      const ts = new Date(image.captureTimestamp ?? image.createdAt).getTime();
      const duplicate = kept.some((other) => {
        const ots = new Date(other.captureTimestamp ?? other.createdAt).getTime();
        return Math.abs(ts - ots) <= windowS*1000 && this.distanceM(image, other) <= distanceM;
      });
      if (!duplicate) kept.push(image);
    }
    return kept;
  }

  private buildZones(processed: AnalysisImage[], infected: AnalysisImage[], radiusM: number, minImages: number, settings: { severityModerate:number; severityHigh:number; severityCritical:number }, previous: Analysis | null) {
    const located = infected.filter((image) => image.latitude !== null && image.longitude !== null);
    const unvisited = new Set(located.map((_,index)=>index));
    const clusters: AnalysisImage[][] = [];
    while (unvisited.size) {
      const seedIndex = unvisited.values().next().value as number;
      unvisited.delete(seedIndex);
      const cluster = [located[seedIndex]];
      const queue = [seedIndex];
      while (queue.length) {
        const current = located[queue.shift()!];
        for (const index of [...unvisited]) {
          if (this.distanceM(current, located[index]) <= radiusM) { unvisited.delete(index); queue.push(index); cluster.push(located[index]); }
        }
      }
      if (cluster.length >= Math.max(1,minImages)) clusters.push(cluster);
    }
    if (!clusters.length && located.length) clusters.push(...located.map((image)=>[image]));

    return clusters.map((cluster) => {
      const lat = cluster.reduce((s,i)=>s+i.latitude!,0)/cluster.length;
      const lon = cluster.reduce((s,i)=>s+i.longitude!,0)/cluster.length;
      const local = processed.filter((image)=>image.latitude!==null && image.longitude!==null && this.distanceM({latitude:lat,longitude:lon}, image) <= radiusM*1.5);
      const localInfected = local.filter((image)=>image.result===AnalysisResult.INFECTED);
      const rate = local.length ? localInfected.length/local.length : 1;
      const confidenceValues = cluster.map((i)=>i.confidence).filter((v):v is number=>v!==null);
      const averageConfidence = confidenceValues.length ? confidenceValues.reduce((a,b)=>a+b,0)/confidenceValues.length : null;
      const geometry = this.clusterGeometry(cluster, Math.max(3, radiusM*0.35));
      const previousZones = previous?.affectedZones ?? [];
      const nearestPrevious = previousZones.map((zone)=>({zone, d:this.distanceM({latitude:lat,longitude:lon},{latitude:zone.latitude,longitude:zone.longitude})})).sort((a,b)=>a.d-b.d)[0];
      const zoneStatus: 'active'|'known'|'regression' = !nearestPrevious || nearestPrevious.d > radiusM*2 ? 'active' : rate < (nearestPrevious.zone.infectionRate ?? nearestPrevious.zone.severity ?? 0) ? 'regression' : 'known';
      return {
        latitude: lat,
        longitude: lon,
        severity: rate,
        severityLevel: this.severityLevel(rate, settings),
        surfaceSquareMeters: this.polygonAreaM2(geometry.coordinates[0]),
        geometry,
        infectionRate: rate,
        diagnosticCount: local.length || cluster.length,
        averageConfidence,
        lastDetectionAt: new Date(Math.max(...cluster.map((i)=>new Date(i.captureTimestamp ?? i.createdAt).getTime()))).toISOString(),
        zoneStatus,
        sourceImageIds: cluster.map((image) => image.id),
      };
    });
  }

  private clusterGeometry(cluster: AnalysisImage[], bufferM: number): { type:'Polygon'; coordinates:number[][][] } {
    const points = cluster.map((i)=>[i.longitude!,i.latitude!] as [number,number]);
    if (points.length < 3) {
      const lon = points.reduce((s,p)=>s+p[0],0)/points.length; const lat = points.reduce((s,p)=>s+p[1],0)/points.length;
      const dLat = bufferM/111320; const dLon = bufferM/(111320*Math.max(0.1,Math.cos(lat*Math.PI/180)));
      const ring = [[lon-dLon,lat-dLat],[lon+dLon,lat-dLat],[lon+dLon,lat+dLat],[lon-dLon,lat+dLat],[lon-dLon,lat-dLat]];
      return {type:'Polygon',coordinates:[ring]};
    }
    const sorted = [...points].sort((a,b)=>a[0]-b[0] || a[1]-b[1]);
    const cross=(o:[number,number],a:[number,number],b:[number,number])=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
    const lower:[number,number][]=[]; for(const p of sorted){while(lower.length>=2&&cross(lower[lower.length-2],lower[lower.length-1],p)<=0)lower.pop();lower.push(p);}
    const upper:[number,number][]=[]; for(const p of [...sorted].reverse()){while(upper.length>=2&&cross(upper[upper.length-2],upper[upper.length-1],p)<=0)upper.pop();upper.push(p);}
    const hull=[...lower.slice(0,-1),...upper.slice(0,-1)]; hull.push(hull[0]);
    return {type:'Polygon',coordinates:[hull]};
  }

  private polygonAreaM2(ring: number[][]): number {
    if (ring.length<4) return 0; const avgLat=ring.reduce((s,p)=>s+p[1],0)/ring.length; const mx=111320*Math.cos(avgLat*Math.PI/180); const my=111320;
    let area=0; for(let i=0;i<ring.length-1;i++){area+=(ring[i][0]*mx)*(ring[i+1][1]*my)-(ring[i+1][0]*mx)*(ring[i][1]*my);} return Math.abs(area/2);
  }

}