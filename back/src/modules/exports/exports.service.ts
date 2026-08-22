import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import archiver from 'archiver';
import type { Archiver } from 'archiver';
import { createReadStream } from 'fs';
import { access } from 'fs/promises';
import * as path from 'path';
import { Repository } from 'typeorm';
import { ConfigService } from '../../libs/infrastructure/config/config.service';
import { AnalysisImageStatus } from '../analyses/entities/analysis-image.entity';
import { AnalysisResult } from '../analyses/entities/analysis-result.enum';
import {
  Parcel,
  TerrainVerificationStatus,
} from '../parcels/entities/parcel.entity';
import { CreateExportDto } from './dtos/create-export.dto';
import {
  ExportFormat,
  ExportRecord,
  ExportScope,
} from './entities/export-record.entity';
import { createReportPdf } from './utils/pdf';

/** Nombre maximum de zones exportables en une fois. */
const MAX_EXPORTED_PARCELS = 5_000;

type ParcelMetrics = {
  parcelId: string;
  imageCount: number;
  processedCount: number;
  infectedCount: number;
};

type ExportFeature = {
  type: 'Feature';
  geometry: Parcel['boundary'];
  properties: {
    parcel_id: string;
    name: string;
    status: string;
    verification: string;
    verified_at: string;
    area_ha: number;
    infection_rate: number;
    image_count: number;
    infected_images: number;
    missions: string;
  };
};

type PreparedExport = {
  features: ExportFeature[];
  parcelIds: string[];
  scopeLabel: string;
};

const METERS_PER_DEGREE_LAT = 111_320;

/** Surface approchée d'un anneau WGS84, en hectares (projection locale). */
function polygonAreaHa(boundary: Parcel['boundary']): number {
  const ring = boundary.coordinates[0] ?? [];
  if (ring.length < 4) return 0;

  const averageLatitude =
    ring.reduce((sum, point) => sum + point[1], 0) / ring.length;
  const metersPerDegreeLon =
    METERS_PER_DEGREE_LAT * Math.cos((averageLatitude * Math.PI) / 180);

  let area = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [lng1, lat1] = ring[index];
    const [lng2, lat2] = ring[index + 1];
    area +=
      lng1 * metersPerDegreeLon * (lat2 * METERS_PER_DEGREE_LAT) -
      lng2 * metersPerDegreeLon * (lat1 * METERS_PER_DEGREE_LAT);
  }
  return Math.abs(area / 2) / 10_000;
}

function csvCell(value: string | number | null | undefined): string {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function xmlEscape(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);

  constructor(
    @InjectRepository(Parcel)
    private readonly parcelRepository: Repository<Parcel>,
    @InjectRepository(ExportRecord)
    private readonly exportRepository: Repository<ExportRecord>,
    private readonly configService: ConfigService,
  ) {}

  list(userId: string): Promise<ExportRecord[]> {
    return this.exportRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  /**
   * Construit l'archive d'export et la renvoie sous forme de flux.
   *
   * L'archive est écrite au fil de l'eau : ni les fichiers générés ni les
   * images sources ne transitent intégralement par la mémoire, et le
   * téléchargement démarre sans attendre la fin de la génération.
   */
  async generate(
    userId: string,
    userEmail: string | null,
    dto: CreateExportDto,
  ): Promise<{ filename: string; archive: Archiver; scopeLabel: string }> {
    this.assertScopeIsComplete(dto);

    const prepared = await this.prepare(userId, dto);
    if (prepared.features.length === 0) {
      throw new BadRequestException(
        dto.verifiedOnly
          ? 'Aucune zone vérifiée ne correspond à cette portée.'
          : 'Aucune donnée ne correspond à cette portée.',
      );
    }

    const formats = [...new Set(dto.formats)];
    await this.exportRepository.insert(
      formats.map((format) => ({
        userId,
        userEmail,
        scope: dto.scope,
        scopeLabel: prepared.scopeLabel,
        format,
        includeSourceImages: dto.includeSourceImages,
        verifiedOnly: dto.verifiedOnly,
      })),
    );

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('warning', (error) => this.logger.warn(error.message));
    archive.on('error', (error) => this.logger.error(error.message));

    for (const format of formats) {
      await this.appendFormat(archive, format, prepared);
    }

    if (dto.includeSourceImages) {
      await this.appendSourceImages(archive, prepared.parcelIds);
    }

    void archive.finalize();

    return {
      filename: `cocoashield-export-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`,
      archive,
      scopeLabel: prepared.scopeLabel,
    };
  }

  private assertScopeIsComplete(dto: CreateExportDto): void {
    const needsScopeId =
      dto.scope === ExportScope.ZONE || dto.scope === ExportScope.MISSION;
    if (needsScopeId && !dto.scopeId) {
      throw new BadRequestException(
        dto.scope === ExportScope.ZONE
          ? 'Une zone doit être sélectionnée.'
          : 'Une mission doit être sélectionnée.',
      );
    }
    if (dto.scope === ExportScope.PERIOD && (!dto.dateFrom || !dto.dateTo)) {
      throw new BadRequestException('Une période complète est requise.');
    }
  }

  /**
   * Sélectionne les parcelles concernées **en base** : la portée, la
   * propriété et le filtre « vérifiées uniquement » sont dans la requête,
   * jamais appliqués après chargement.
   */
  private async prepare(
    userId: string,
    dto: CreateExportDto,
  ): Promise<PreparedExport> {
    const query = this.parcelRepository
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.analyses', 'analysis')
      .leftJoinAndSelect('analysis.mission', 'mission')
      .where('parcel.owner_id = :userId', { userId })
      .orderBy('parcel.created_at', 'DESC')
      .take(MAX_EXPORTED_PARCELS);

    if (dto.verifiedOnly) {
      query.andWhere('parcel.terrain_verification_status = :verified', {
        verified: TerrainVerificationStatus.VERIFIED,
      });
    }

    let scopeLabel = '';
    if (dto.scope === ExportScope.ZONE) {
      query.andWhere('parcel.id = :scopeId', { scopeId: dto.scopeId });
    } else if (dto.scope === ExportScope.MISSION) {
      query.andWhere('analysis.mission_id = :scopeId', {
        scopeId: dto.scopeId,
      });
    } else {
      query.andWhere(
        'COALESCE(mission.mission_date, analysis.created_at) BETWEEN :from AND :to',
        {
          from: new Date(`${dto.dateFrom}T00:00:00.000Z`),
          to: new Date(`${dto.dateTo}T23:59:59.999Z`),
        },
      );
      scopeLabel = `${dto.dateFrom} → ${dto.dateTo}`;
    }

    const parcels = await query.getMany();
    if (parcels.length === 0) {
      return { features: [], parcelIds: [], scopeLabel };
    }

    if (dto.scope === ExportScope.ZONE) {
      scopeLabel = parcels[0].name;
    } else if (dto.scope === ExportScope.MISSION) {
      scopeLabel =
        parcels[0].analyses?.[0]?.mission?.name ?? `Mission ${dto.scopeId}`;
    }

    const parcelIds = parcels.map((parcel) => parcel.id);
    const metrics = await this.loadMetrics(parcelIds);

    const features = parcels.map((parcel): ExportFeature => {
      const parcelMetrics = metrics.get(parcel.id);
      const processed = parcelMetrics?.processedCount ?? 0;
      const infected = parcelMetrics?.infectedCount ?? 0;
      const missions = Array.from(
        new Set(
          (parcel.analyses ?? [])
            .map((analysis) => analysis.mission?.name)
            .filter((name): name is string => Boolean(name)),
        ),
      );

      return {
        type: 'Feature',
        geometry: parcel.boundary,
        properties: {
          parcel_id: parcel.id,
          name: parcel.name,
          status: parcel.status,
          verification: parcel.terrainVerificationStatus,
          verified_at: parcel.terrainVerifiedAt?.toISOString() ?? '',
          area_ha: Number(polygonAreaHa(parcel.boundary).toFixed(4)),
          infection_rate:
            processed > 0
              ? Number(((infected / processed) * 100).toFixed(2))
              : 0,
          image_count: parcelMetrics?.imageCount ?? 0,
          infected_images: infected,
          missions: missions.join(' | '),
        },
      };
    });

    return { features, parcelIds, scopeLabel };
  }

  /** Compte les images par parcelle en SQL, sans hydrater chaque ligne. */
  private async loadMetrics(
    parcelIds: string[],
  ): Promise<Map<string, ParcelMetrics>> {
    const rows = await this.parcelRepository.manager
      .createQueryBuilder()
      .select('analysis.parcel_id', 'parcelId')
      .addSelect('COUNT(image.id)', 'imageCount')
      .addSelect(
        `COUNT(image.id) FILTER (WHERE image.status = :processed)`,
        'processedCount',
      )
      .addSelect(
        `COUNT(image.id) FILTER (WHERE image.result = :infected)`,
        'infectedCount',
      )
      .from('analysis_image', 'image')
      .innerJoin('analysis', 'analysis', 'analysis.id = image.analysis_id')
      .where('analysis.parcel_id IN (:...parcelIds)', { parcelIds })
      .setParameters({
        processed: AnalysisImageStatus.PROCESSED,
        infected: AnalysisResult.INFECTED,
      })
      .groupBy('analysis.parcel_id')
      .getRawMany<{
        parcelId: string;
        imageCount: string;
        processedCount: string;
        infectedCount: string;
      }>();

    return new Map(
      rows.map((row) => [
        row.parcelId,
        {
          parcelId: row.parcelId,
          imageCount: Number(row.imageCount),
          processedCount: Number(row.processedCount),
          infectedCount: Number(row.infectedCount),
        },
      ]),
    );
  }

  private async appendFormat(
    archive: Archiver,
    format: ExportFormat,
    prepared: PreparedExport,
  ): Promise<void> {
    switch (format) {
      case ExportFormat.GEOJSON:
        archive.append(
          JSON.stringify(
            { type: 'FeatureCollection', features: prepared.features },
            null,
            2,
          ),
          { name: 'zones.geojson' },
        );
        return;

      case ExportFormat.CSV:
        archive.append(this.csv(prepared.features), { name: 'zones.csv' });
        return;

      case ExportFormat.KML_KMZ:
        archive.append(this.kml(prepared.features), { name: 'zones.kml' });
        return;

      case ExportFormat.PDF:
        archive.append(this.pdf(prepared), { name: 'rapport.pdf' });
        return;

      case ExportFormat.SHAPEFILE:
        archive.append(await this.shapefile(prepared.features), {
          name: 'zones-shapefile.zip',
        });
        return;
    }
  }

  private pdf(prepared: PreparedExport) {
    return createReportPdf(
      'Cocoashield — Export phytosanitaire',
      `Portée : ${prepared.scopeLabel} · ${prepared.features.length} zone(s)`,
      prepared.features.map((feature) => ({
        title: feature.properties.name,
        lines: [
          `Surface : ${feature.properties.area_ha} ha`,
          `Taux d'infection : ${feature.properties.infection_rate} %`,
          `Images analysées : ${feature.properties.image_count} (dont ${feature.properties.infected_images} infectées)`,
          `Vérification terrain : ${feature.properties.verification}`,
          feature.properties.missions
            ? `Missions : ${feature.properties.missions}`
            : 'Missions : —',
        ],
      })),
    );
  }

  /**
   * Génère un Shapefile via `@mapbox/shp-write` plutôt qu'une écriture
   * binaire maison : la spécification (`.shp`, `.shx`, `.dbf`, encodage des
   * attributs) est portée par la librairie.
   */
  private async shapefile(features: ExportFeature[]): Promise<Buffer> {
    const { zip } = (await import('@mapbox/shp-write')) as {
      zip: (geojson: unknown) => string | Promise<string>;
    };
    const base64 = await zip({ type: 'FeatureCollection', features });
    return Buffer.from(base64, 'base64');
  }

  private csv(features: ExportFeature[]): string {
    const headers = [
      'parcel_id',
      'name',
      'status',
      'verification',
      'verified_at',
      'area_ha',
      'infection_rate',
      'image_count',
      'infected_images',
      'missions',
      'geometry_geojson',
    ];
    const rows = features.map((feature) =>
      [
        ...headers
          .slice(0, -1)
          .map(
            (header) =>
              feature.properties[header as keyof ExportFeature['properties']],
          ),
        JSON.stringify(feature.geometry),
      ]
        .map(csvCell)
        .join(','),
    );
    // BOM UTF-8 : sans lui, Excel affiche les accents de travers.
    return `\uFEFF${headers.join(',')}\n${rows.join('\n')}\n`;
  }

  private kml(features: ExportFeature[]): string {
    const placemarks = features
      .map((feature) => {
        const properties = feature.properties;
        const extended = Object.entries(properties)
          .map(
            ([key, value]) =>
              `<Data name="${xmlEscape(key)}"><value>${xmlEscape(value)}</value></Data>`,
          )
          .join('');
        const coordinates = feature.geometry.coordinates[0]
          .map(([lng, lat]) => `${lng},${lat},0`)
          .join(' ');
        return `<Placemark><name>${xmlEscape(properties.name)}</name><ExtendedData>${extended}</ExtendedData><Polygon><outerBoundaryIs><LinearRing><coordinates>${coordinates}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`;
      })
      .join('');
    return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Cocoashield</name>${placemarks}</Document></kml>`;
  }

  /** Ajoute les images sources en flux, une par une. */
  private async appendSourceImages(
    archive: Archiver,
    parcelIds: string[],
  ): Promise<void> {
    const rows = await this.parcelRepository.manager
      .createQueryBuilder()
      .select('DISTINCT image.file_path', 'filePath')
      .from('analysis_image', 'image')
      .innerJoin('analysis', 'analysis', 'analysis.id = image.analysis_id')
      .where('analysis.parcel_id IN (:...parcelIds)', { parcelIds })
      .andWhere('image.file_path IS NOT NULL')
      .getRawMany<{ filePath: string }>();

    for (const { filePath } of rows) {
      const absolutePath = path.join(this.configService.uploadsDir, filePath);
      try {
        await access(absolutePath);
      } catch {
        // Un fichier source manquant ne rend pas les données SIG inutilisables.
        this.logger.warn(`Image source introuvable, ignorée : ${filePath}`);
        continue;
      }
      archive.append(createReadStream(absolutePath), {
        name: `images-sources/${filePath}`,
      });
    }
  }
}
