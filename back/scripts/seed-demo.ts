import { NestFactory } from '@nestjs/core';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

import { AppModule } from '../src/app.module';
import type { Auth } from '../src/modules/auth/auth.provider';
import { UsersService } from '../src/modules/users/users.service';
import {
  UserRole,
  UserStatus,
} from '../src/modules/users/entities/user-profile.entity';
import {
  Parcel,
  ParcelStatus,
  TerrainVerificationStatus,
} from '../src/modules/parcels/entities/parcel.entity';
import { Mission } from '../src/modules/missions/entities/mission.entity';
import {
  Analysis,
  AnalysisStatus,
} from '../src/modules/analyses/entities/analysis.entity';
import {
  AnalysisImage,
  AnalysisImageSource,
  AnalysisImageStatus,
  GeolocationQuality,
} from '../src/modules/analyses/entities/analysis-image.entity';
import { AnalysisResult } from '../src/modules/analyses/entities/analysis-result.enum';
import { PlatformSettings } from '../src/modules/platform-config/entities/platform-settings.entity';
import { DroneProfile } from '../src/modules/platform-config/entities/drone-profile.entity';
import {
  ExportFormat,
  ExportRecord,
  ExportScope,
} from '../src/modules/exports/entities/export-record.entity';
import { AuditLog } from '../src/modules/audit/entities/audit-log.entity';

const DEMO_PASSWORD = 'CocoaDemo2026!';
const DEMO_USERS = [
  {
    email: 'admin@cocoashield.local',
    username: 'Awa.Kone',
    role: UserRole.ADMINISTRATEUR,
    cooperative: 'Cocoashield',
  },
  {
    email: 'direction@ccc.ci',
    username: 'Direction.CCC',
    role: UserRole.DIRECTION_CCC,
    cooperative: 'Conseil du Café-Cacao',
  },
  {
    email: 'agronome@cocoashield.local',
    username: 'Jean.Dupont',
    role: UserRole.AGRONOME_TERRAIN,
    cooperative: 'COOP-CA Soubré',
  },
] as const;

const demoPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

async function ensureUser(
  auth: Auth,
  dataSource: DataSource,
  email: string,
  username: string,
) {
  const queryResult: unknown = await dataSource.query(
    `SELECT id, name, email FROM "user" WHERE email = $1 LIMIT 1`,
    [email],
  );
  const rows = Array.isArray(queryResult)
    ? (queryResult as Array<{ id: string; name: string; email: string }>)
    : [];
  if (rows[0]) return rows[0];
  const result = await auth.api.signUpEmail({
    body: {
      email,
      password: DEMO_PASSWORD,
      name: username.replace('.', ' '),
      username,
    },
  });
  return result.user;
}

function square(lng: number, lat: number, size = 0.007) {
  return {
    type: 'Polygon' as const,
    coordinates: [
      [
        [lng, lat],
        [lng + size, lat],
        [lng + size, lat + size],
        [lng, lat + size],
        [lng, lat],
      ],
    ],
  };
}

async function seedOwner(
  dataSource: DataSource,
  user: { id: string; email: string },
  offset: number,
) {
  const parcelRepo = dataSource.getRepository(Parcel);
  const missionRepo = dataSource.getRepository(Mission);
  const analysisRepo = dataSource.getRepository(Analysis);
  const imageRepo = dataSource.getRepository(AnalysisImage);
  const settingsRepo = dataSource.getRepository(PlatformSettings);
  const droneRepo = dataSource.getRepository(DroneProfile);
  const exportRepo = dataSource.getRepository(ExportRecord);
  const auditRepo = dataSource.getRepository(AuditLog);

  const existingParcels = await parcelRepo.find({
    where: { ownerId: user.id },
  });
  if (existingParcels.length) await parcelRepo.remove(existingParcels);
  await missionRepo.delete({ ownerId: user.id });
  await settingsRepo.delete({ ownerId: user.id });
  await droneRepo.delete({ ownerId: user.id });
  await exportRepo.delete({ userId: user.id });
  await auditRepo.delete({ userId: user.id });

  const now = Date.now();
  const mission1 = await missionRepo.save(
    missionRepo.create({
      ownerId: user.id,
      name: 'Tournée Soubré · Secteur Nord',
      missionDate: new Date(now - 3 * 86400000),
      notes: 'Contrôle des foyers signalés et prises de vues terrain.',
    }),
  );
  const mission2 = await missionRepo.save(
    missionRepo.create({
      ownerId: user.id,
      name: 'Campagne sanitaire · Semaine 31',
      missionDate: new Date(now - 18 * 86400000),
      notes: 'Échantillonnage régulier des feuilles et vérification terrain.',
    }),
  );
  const mission3 = await missionRepo.save(
    missionRepo.create({
      ownerId: user.id,
      name: 'Suivi préventif · Bas-Sassandra',
      missionDate: new Date(now - 48 * 86400000),
      notes: 'Mission de référence pour comparaison temporelle.',
    }),
  );

  const baseLng = -6.59 + offset * 0.03;
  const baseLat = 5.79 + offset * 0.02;
  const parcels = await parcelRepo.save([
    parcelRepo.create({
      ownerId: user.id,
      name: 'Plantation Akouédo A-12',
      boundary: square(baseLng, baseLat),
      status: ParcelStatus.SICK,
      terrainVerificationStatus: TerrainVerificationStatus.VERIFIED,
      terrainVerificationComment:
        'Présence de symptômes confirmée sur la bordure est.',
      terrainVerifiedAt: new Date(now - 2 * 86400000),
    }),
    parcelRepo.create({
      ownerId: user.id,
      name: 'Parcelle Nawa B-07',
      boundary: square(baseLng + 0.012, baseLat + 0.008, 0.006),
      status: ParcelStatus.HEALTHY,
      terrainVerificationStatus: TerrainVerificationStatus.VERIFIED,
      terrainVerificationComment: 'Parcelle saine lors du dernier passage.',
      terrainVerifiedAt: new Date(now - 7 * 86400000),
    }),
    parcelRepo.create({
      ownerId: user.id,
      name: 'Bloc Méagui C-04',
      boundary: square(baseLng - 0.011, baseLat + 0.016, 0.008),
      status: ParcelStatus.ANALYZING,
      terrainVerificationStatus: TerrainVerificationStatus.PENDING,
      terrainVerificationComment: null,
      terrainVerifiedAt: null,
    }),
  ]);

  const uploadDir = path.resolve(
    process.cwd(),
    process.env.UPLOADS_DIR || './uploads',
  );
  fs.mkdirSync(uploadDir, { recursive: true });

  const specs = [
    {
      parcel: parcels[0],
      mission: mission1,
      status: AnalysisStatus.COMPLETED,
      result: AnalysisResult.INFECTED,
      days: 2,
      infected: 4,
      healthy: 2,
      notes:
        'Foyer localisé sur la bordure est. Contrôle recommandé sous 7 jours.',
    },
    {
      parcel: parcels[1],
      mission: mission2,
      status: AnalysisStatus.COMPLETED,
      result: AnalysisResult.HEALTHY,
      days: 9,
      infected: 0,
      healthy: 5,
      notes: 'Couvert végétal homogène. Aucun symptôme critique observé.',
    },
    {
      parcel: parcels[2],
      mission: mission1,
      status: AnalysisStatus.PROCESSING,
      result: null,
      days: 1,
      infected: 1,
      healthy: 2,
      notes: 'Images en cours de traitement. Observation terrain à confirmer.',
    },
    {
      parcel: parcels[0],
      mission: mission3,
      status: AnalysisStatus.COMPLETED,
      result: AnalysisResult.HEALTHY,
      days: 45,
      infected: 0,
      healthy: 4,
      notes: 'État de référence avant apparition du foyer actuel.',
    },
  ];

  for (let s = 0; s < specs.length; s += 1) {
    const spec = specs[s];
    const createdAt = new Date(now - spec.days * 86400000);
    const [originLng, originLat] = spec.parcel.boundary.coordinates[0][0];
    const total = spec.infected + spec.healthy;
    const infectionPercentage = total > 0 ? (spec.infected / total) * 100 : 0;
    const severityLevel =
      infectionPercentage >= 40
        ? 'critique'
        : infectionPercentage >= 25
          ? 'eleve'
          : infectionPercentage >= 10
            ? 'modere'
            : 'faible';
    const completedAt =
      spec.status === AnalysisStatus.COMPLETED
        ? new Date(createdAt.getTime() + 45 * 60000)
        : null;
    const affectedZones =
      spec.status === AnalysisStatus.COMPLETED
        ? Array.from({ length: spec.infected }, (_, i) => ({
            latitude: originLat + 0.002 + i * 0.0004,
            longitude: originLng + 0.002 + i * 0.0004,
            severity: Math.max(0.35, 0.9 - i * 0.08),
          }))
        : null;
    const analysis = await analysisRepo.save(
      analysisRepo.create({
        parcelId: spec.parcel.id,
        missionId: spec.mission.id,
        profileId: s % 2 === 0 ? 'DJI-M3M-RTK' : null,
        status: spec.status,
        result: spec.result,
        notes: spec.notes,
        completedAt,
        infectionPercentage:
          spec.status === AnalysisStatus.COMPLETED ? infectionPercentage : null,
        severityLevel:
          spec.status === AnalysisStatus.COMPLETED ? severityLevel : null,
        affectedZones,
        reportGeneratedAt: completedAt,
        createdAt,
      }),
    );
    const imageCount = spec.infected + spec.healthy;
    for (let i = 0; i < imageCount; i += 1) {
      const infected = i < spec.infected;
      const filename = `demo-${user.id.slice(0, 6)}-${s}-${i}.png`;
      fs.writeFileSync(path.join(uploadDir, filename), demoPng);
      await imageRepo.save(
        imageRepo.create({
          analysisId: analysis.id,
          filePath: filename,
          source: AnalysisImageSource.MOBILE,
          status:
            spec.status === AnalysisStatus.PROCESSING && i === imageCount - 1
              ? AnalysisImageStatus.PENDING
              : AnalysisImageStatus.PROCESSED,
          result:
            spec.status === AnalysisStatus.PROCESSING && i === imageCount - 1
              ? null
              : infected
                ? AnalysisResult.INFECTED
                : AnalysisResult.HEALTHY,
          confidence: infected ? 0.91 - i * 0.02 : 0.94 - i * 0.01,
          latitude: originLat + 0.002 + i * 0.0004,
          longitude: originLng + 0.002 + i * 0.0004,
          geolocationQuality:
            i % 3 === 0
              ? GeolocationQuality.PRECISE
              : GeolocationQuality.APPROXIMATE,
        }),
      );
    }
  }

  await settingsRepo.save(
    settingsRepo.create({
      ownerId: user.id,
      severityModerate: 0.1,
      severityHigh: 0.25,
      severityCritical: 0.4,
      clusteringRadiusM: 25,
      minImagesPerZone: 4,
    }),
  );
  await droneRepo.save(
    droneRepo.create({
      ownerId: user.id,
      profileId: 'DJI-M3M-RTK',
      manufacturer: 'DJI',
      model: 'Mavic 3 Multispectral',
      rtkPrecisionCm: 2.5,
      metadataFormat: 'EXIF/XMP',
      active: true,
    }),
  );
  await droneRepo.save(
    droneRepo.create({
      ownerId: user.id,
      profileId: 'MOBILE-TERRAIN',
      manufacturer: 'Cocoashield',
      model: 'Mobile terrain',
      rtkPrecisionCm: null,
      metadataFormat: 'EXIF',
      active: true,
    }),
  );

  await exportRepo.save(
    exportRepo.create({
      userId: user.id,
      userEmail: user.email,
      scope: ExportScope.ZONE,
      scopeLabel: parcels[0].name,
      format: ExportFormat.PDF,
      includeSourceImages: false,
      verifiedOnly: true,
    }),
  );
  await exportRepo.save(
    exportRepo.create({
      userId: user.id,
      userEmail: user.email,
      scope: ExportScope.MISSION,
      scopeLabel: mission1.name,
      format: ExportFormat.CSV,
      includeSourceImages: false,
      verifiedOnly: false,
    }),
  );

  await auditRepo.save([
    auditRepo.create({
      userId: user.id,
      userEmail: user.email,
      action: 'parcel.consulted',
      targetType: 'parcel',
      targetId: parcels[0].id,
      targetLabel: parcels[0].name,
      ipAddress: '127.0.0.1',
      details: { source: 'demo' },
    }),
    auditRepo.create({
      userId: user.id,
      userEmail: user.email,
      action: 'parcel.verified',
      targetType: 'parcel',
      targetId: parcels[1].id,
      targetLabel: parcels[1].name,
      ipAddress: '127.0.0.1',
      details: { source: 'demo', verificationStatus: 'verified' },
    }),
    auditRepo.create({
      userId: user.id,
      userEmail: user.email,
      action: 'export.generated',
      targetType: 'export',
      targetId: null,
      targetLabel: mission1.name,
      ipAddress: '127.0.0.1',
      details: { format: 'pdf', source: 'demo' },
    }),
  ]);
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const dataSource = app.get(DataSource);
  const usersService = app.get(UsersService);
  const authService = app.get(AuthService);
  const auth = authService.instance as unknown as Auth;

  for (let index = 0; index < DEMO_USERS.length; index += 1) {
    const spec = DEMO_USERS[index];
    const user = await ensureUser(auth, dataSource, spec.email, spec.username);
    await usersService.update(user.id, {
      role: spec.role,
      cooperative: spec.cooperative,
      status: UserStatus.ACTIVE,
    });
    await seedOwner(dataSource, { id: user.id, email: spec.email }, index);
  }

  console.log('\nDonnées Cocoashield de démonstration prêtes.');
  console.log(`Mot de passe commun : ${DEMO_PASSWORD}`);
  for (const spec of DEMO_USERS) console.log(`- ${spec.email} (${spec.role})`);
  await app.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
