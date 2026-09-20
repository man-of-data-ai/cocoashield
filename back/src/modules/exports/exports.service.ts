import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { In, IsNull, Repository } from 'typeorm';
import { ConfigService } from '../../libs/infrastructure/config/config.service';
import { Analysis } from '../analyses/entities/analysis.entity';
import { Parcel, TerrainVerificationStatus } from '../parcels/entities/parcel.entity';
import { CreateExportDto } from './dtos/create-export.dto';
import { AuditService } from '../audit/audit.service';
import { UsersService } from '../users/users.service';
import {
  ExportFormat,
  ExportRecord,
  ExportScope,
} from './entities/export-record.entity';
import { ArchiveEntry, createZip } from './utils/archive';
import { createSimplePdf } from './utils/pdf';
import { createShapefileZip } from './utils/shapefile';

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
    severity: string;
    detection_date: string;
    zone_status: string;
  };
};

type PreparedExport = {
  features: ExportFeature[];
  analysesByParcel: Map<string, Analysis[]>;
  scopeLabel: string;
};

function polygonAreaHa(boundary: Parcel['boundary']): number {
  const ring = boundary.coordinates[0] ?? [];
  if (ring.length < 4) return 0;
  const avgLat =
    ring.reduce((sum, point) => sum + point[1], 0) / Math.max(ring.length, 1);
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLon = 111_320 * Math.cos((avgLat * Math.PI) / 180);
  let area = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [lng1, lat1] = ring[index];
    const [lng2, lat2] = ring[index + 1];
    const x1 = lng1 * metersPerDegreeLon;
    const y1 = lat1 * metersPerDegreeLat;
    const x2 = lng2 * metersPerDegreeLon;
    const y2 = lat2 * metersPerDegreeLat;
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2) / 10_000;
}

function pointBufferBoundary(longitude: number, latitude: number, radiusM = 5): Parcel['boundary'] {
  const dLat = radiusM / 111_320;
  const dLon = radiusM / (111_320 * Math.max(0.1, Math.cos((latitude * Math.PI) / 180)));
  return { type: 'Polygon', coordinates: [[[longitude-dLon, latitude-dLat],[longitude+dLon, latitude-dLat],[longitude+dLon, latitude+dLat],[longitude-dLon, latitude+dLat],[longitude-dLon, latitude-dLat]]] };
}

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function xml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

@Injectable()
export class ExportsService {
  constructor(
    @InjectRepository(Parcel)
    private readonly parcelRepository: Repository<Parcel>,
    @InjectRepository(ExportRecord)
    private readonly exportRepository: Repository<ExportRecord>,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  list(userId: string): Promise<ExportRecord[]> {
    return this.exportRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }


  async generate(
    userId: string,
    userEmail: string | null,
    dto: CreateExportDto,
    ipAddress: string | null = null,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    if (dto.scope === ExportScope.ZONE && !dto.scopeId) {
      throw new BadRequestException('Une zone doit être sélectionnée.');
    }
    if (dto.scope === ExportScope.MISSION && !dto.scopeId) {
      throw new BadRequestException('Une mission doit être sélectionnée.');
    }
    if (dto.scope === ExportScope.PERIOD && (!dto.dateFrom || !dto.dateTo)) {
      throw new BadRequestException('Une période complète est requise.');
    }

    const prepared = await this.prepare(userId, dto);
    if (prepared.features.length === 0) {
      throw new BadRequestException(
        dto.verifiedOnly
          ? 'Aucune zone vérifiée ne correspond à cette portée.'
          : 'Aucune donnée ne correspond à cette portée.',
      );
    }

    const generated: ArchiveEntry[] = [];
    for (const format of [...new Set(dto.formats)]) {
      generated.push(this.generateFormat(format, prepared));
      await this.exportRepository.save(
        this.exportRepository.create({
          userId,
          userEmail,
          scope: dto.scope,
          scopeLabel: prepared.scopeLabel,
          format,
          includeSourceImages: dto.includeSourceImages,
          verifiedOnly: dto.verifiedOnly,
        }),
      );
      await this.auditService.log({
        userId,
        userEmail,
        ipAddress,
        action: 'export.created',
        targetType: 'export',
        targetLabel: prepared.scopeLabel,
        details: {
          scope: dto.scope,
          scopeLabel: prepared.scopeLabel,
          format,
          includeSourceImages: dto.includeSourceImages,
          verifiedOnly: dto.verifiedOnly,
          exportedZones: prepared.features.length,
        },
      });
    }

    if (dto.includeSourceImages) {
      const imageEntries = await this.collectSourceImages(prepared.analysesByParcel);
      generated.push(...imageEntries);
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    if (generated.length === 1 && !dto.includeSourceImages) {
      const file = generated[0];
      return {
        buffer: file.data,
        filename: `cocoashield-export-${stamp}-${file.name}`,
        contentType: this.contentType(file.name),
      };
    }

    return {
      buffer: createZip(generated),
      filename: `cocoashield-export-${stamp}.zip`,
      contentType: 'application/zip',
    };
  }

  private async prepare(userId: string, dto: CreateExportDto): Promise<PreparedExport> {
    const scope = await this.usersService.getAccessScope(userId);
    const where = scope.isPlatformAdmin
      ? undefined
      : scope.organizationIds.length
        ? [{ organizationId: In(scope.organizationIds) }, { ownerId: userId, organizationId: IsNull() }]
        : [{ ownerId: userId }];
    const parcels = await this.parcelRepository.find({
      where,
      relations: { analyses: { images: true, mission: true } },
      order: { createdAt: 'DESC' },
    });

    const analysesByParcel = new Map<string, Analysis[]>();
    let scopeLabel = '';

    const selected = parcels.filter((parcel) => {
      if (
        dto.verifiedOnly &&
        parcel.terrainVerificationStatus !== TerrainVerificationStatus.VERIFIED
      ) {
        return false;
      }

      let analyses = parcel.analyses ?? [];
      if (dto.scope === ExportScope.ZONE) {
        const [analysisId] = String(dto.scopeId).split(':');
        analyses = analyses.filter((analysis) => analysis.id === analysisId);
        if (analyses.length === 0) return false;
        scopeLabel = `${parcel.name} · zone sélectionnée`;
      } else if (dto.scope === ExportScope.MISSION) {
        analyses = analyses.filter((analysis) => analysis.missionId === dto.scopeId);
        if (analyses.length === 0) return false;
        scopeLabel = analyses[0]?.mission?.name ?? `Mission ${dto.scopeId}`;
      } else {
        const from = new Date(`${dto.dateFrom}T00:00:00.000Z`);
        const to = new Date(`${dto.dateTo}T23:59:59.999Z`);
        analyses = analyses.filter((analysis) => {
          const date = analysis.mission?.missionDate
            ? new Date(analysis.mission.missionDate)
            : new Date(analysis.createdAt);
          return date >= from && date <= to;
        });
        if (analyses.length === 0) return false;
        scopeLabel = `${dto.dateFrom} → ${dto.dateTo}`;
      }
      analysesByParcel.set(parcel.id, analyses);
      return true;
    });

    const features = selected.flatMap((parcel): ExportFeature[] => {
      const analyses = analysesByParcel.get(parcel.id) ?? [];
      const zoneTarget = dto.scope === ExportScope.ZONE ? String(dto.scopeId).split(':') : null;
      const zoneFeatures: ExportFeature[] = [];

      for (const analysis of analyses) {
        const zones = analysis.affectedZones ?? [];
        zones.forEach((zone, index) => {
          if (zoneTarget && (analysis.id !== zoneTarget[0] || String(index) !== zoneTarget[1])) return;
          const geometry = zone.geometry ?? pointBufferBoundary(zone.longitude, zone.latitude);
          const date = zone.lastDetectionAt ?? analysis.completedAt?.toISOString?.() ?? analysis.createdAt?.toISOString?.() ?? '';
          const infectionRate = Math.max(0, Math.min(1, zone.infectionRate ?? zone.severity ?? 0));
          const count = zone.diagnosticCount ?? 0;
          zoneFeatures.push({
            type: 'Feature',
            geometry,
            properties: {
              parcel_id: parcel.id,
              name: `${parcel.name} - zone ${index + 1}`,
              status: parcel.status,
              verification: parcel.terrainVerificationStatus,
              verified_at: parcel.terrainVerifiedAt?.toISOString?.() ?? '',
              area_ha: Number(((zone.surfaceSquareMeters ?? polygonAreaHa(geometry) * 10_000) / 10_000).toFixed(4)),
              infection_rate: Number((infectionRate * 100).toFixed(2)),
              image_count: count,
              infected_images: Math.round(count * infectionRate),
              missions: analysis.mission?.name ?? '',
              severity: zone.severityLevel ?? analysis.severityLevel ?? '',
              detection_date: date,
              zone_status: zone.zoneStatus ?? 'active',
            },
          });
        });
      }

      if (zoneFeatures.length > 0 || dto.scope === ExportScope.ZONE) return zoneFeatures;

      // Compatibilité avec les anciennes analyses qui ne possèdent pas encore de zones agrégées.
      const images = analyses.flatMap((analysis) => analysis.images ?? []);
      const processed = images.filter((image) => image.status === 'processed');
      const infected = processed.filter((image) => image.result === 'infected');
      const latest = analyses[0];
      return [{
        type: 'Feature',
        geometry: parcel.boundary,
        properties: {
          parcel_id: parcel.id,
          name: parcel.name,
          status: parcel.status,
          verification: parcel.terrainVerificationStatus,
          verified_at: parcel.terrainVerifiedAt?.toISOString?.() ?? '',
          area_ha: Number(polygonAreaHa(parcel.boundary).toFixed(4)),
          infection_rate: processed.length > 0 ? Number(((infected.length / processed.length) * 100).toFixed(2)) : 0,
          image_count: images.length,
          infected_images: infected.length,
          missions: Array.from(new Set(analyses.map((analysis) => analysis.mission?.name).filter((value): value is string => Boolean(value)))).join(' | '),
          severity: latest?.severityLevel ?? '',
          detection_date: latest?.completedAt?.toISOString?.() ?? latest?.createdAt?.toISOString?.() ?? '',
          zone_status: '',
        },
      }];
    });

    return { features, analysesByParcel, scopeLabel };
  }

  private generateFormat(format: ExportFormat, prepared: PreparedExport): ArchiveEntry {
    switch (format) {
      case ExportFormat.GEOJSON:
        return {
          name: 'zones.geojson',
          data: Buffer.from(
            JSON.stringify(
              { type: 'FeatureCollection', features: prepared.features },
              null,
              2,
            ),
          ),
        };
      case ExportFormat.SHAPEFILE:
        return {
          name: 'zones-shapefile.zip',
          data: createShapefileZip(
            prepared.features.map((feature) => ({
              coordinates: feature.geometry.coordinates[0],
              properties: feature.properties,
            })),
          ),
        };
      case ExportFormat.KML_KMZ: {
        const kml = this.kml(prepared.features);
        return {
          name: 'zones.kmz',
          data: createZip([{ name: 'doc.kml', data: Buffer.from(kml) }]),
        };
      }
      case ExportFormat.CSV:
        return { name: 'zones.csv', data: Buffer.from(this.csv(prepared.features), 'utf8') };
      case ExportFormat.PDF:
        return {
          name: 'rapport.pdf',
          data: createSimplePdf('Cocoashield - Export phytosanitaire', [
            `Portée : ${prepared.scopeLabel}`,
            `Zones exportées : ${prepared.features.length}`,
            ...prepared.features.flatMap((feature) => [
              `${feature.properties.name} — ${feature.properties.area_ha} ha`,
              `Taux infection : ${feature.properties.infection_rate}% — Sévérité : ${feature.properties.severity || "—"} — Images : ${feature.properties.image_count}`,
              `Dernière détection : ${feature.properties.detection_date || "—"} — Vérification : ${feature.properties.verification}`,
            ]),
            'Mention : non-garantie diagnostique.',
          ]),
        };
    }
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
      'severity',
      'detection_date',
      'zone_status',
      'geometry_geojson',
    ];
    const rows = features.map((feature) =>
      [
        feature.properties.parcel_id,
        feature.properties.name,
        feature.properties.status,
        feature.properties.verification,
        feature.properties.verified_at,
        feature.properties.area_ha,
        feature.properties.infection_rate,
        feature.properties.image_count,
        feature.properties.infected_images,
        feature.properties.missions,
        feature.properties.severity,
        feature.properties.detection_date,
        feature.properties.zone_status,
        JSON.stringify(feature.geometry),
      ]
        .map(csvCell)
        .join(','),
    );
    return `\uFEFF${headers.join(',')}\n${rows.join('\n')}\n`;
  }

  private kml(features: ExportFeature[]): string {
    const placemarks = features
      .map((feature) => {
        const props = feature.properties;
        const extended = Object.entries(props)
          .map(([key, value]) => `<Data name="${xml(key)}"><value>${xml(value)}</value></Data>`)
          .join('');
        const coordinates = feature.geometry.coordinates[0]
          .map(([lng, lat]) => `${lng},${lat},0`)
          .join(' ');
        return `<Placemark><name>${xml(props.name)}</name><ExtendedData>${extended}</ExtendedData><Polygon><outerBoundaryIs><LinearRing><coordinates>${coordinates}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`;
      })
      .join('');
    return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Cocoashield</name>${placemarks}</Document></kml>`;
  }

  private async collectSourceImages(
    analysesByParcel: Map<string, Analysis[]>,
  ): Promise<ArchiveEntry[]> {
    const entries: ArchiveEntry[] = [];
    const seen = new Set<string>();
    for (const analyses of analysesByParcel.values()) {
      for (const image of analyses.flatMap((analysis) => analysis.images ?? [])) {
        if (!image.filePath || seen.has(image.filePath)) continue;
        seen.add(image.filePath);
        try {
          const data = await fs.readFile(
            path.join(this.configService.uploadsDir, image.filePath),
          );
          entries.push({ name: `images-sources/${image.filePath}`, data });
        } catch {
          // Un fichier source manquant ne rend pas les données SIG inutilisables.
        }
      }
    }
    return entries;
  }

  private contentType(filename: string): string {
    if (filename.endsWith('.geojson')) return 'application/geo+json';
    if (filename.endsWith('.csv')) return 'text/csv; charset=utf-8';
    if (filename.endsWith('.pdf')) return 'application/pdf';
    if (filename.endsWith('.kmz')) return 'application/vnd.google-earth.kmz';
    return 'application/zip';
  }
}
