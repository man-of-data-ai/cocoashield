import { NestFactory } from '@nestjs/core';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import type { Auth } from '../src/modules/auth/auth.provider';
import { UsersService } from '../src/modules/users/users.service';
import {
  UserRole,
  UserStatus,
} from '../src/modules/users/entities/user-profile.entity';
import {
  Parcel,
  TerrainVerificationStatus,
} from '../src/modules/parcels/entities/parcel.entity';
import { Mission } from '../src/modules/missions/entities/mission.entity';
import { PlatformSettings } from '../src/modules/platform-config/entities/platform-settings.entity';
import { DroneProfile } from '../src/modules/platform-config/entities/drone-profile.entity';
import {
  ExportFormat,
  ExportRecord,
  ExportScope,
} from '../src/modules/exports/entities/export-record.entity';
import { AuditLog } from '../src/modules/audit/entities/audit-log.entity';
import { Organization, OrganizationType, ServiceOffer } from '../src/modules/organizations/entities/organization.entity';

const DEMO_PASSWORD = 'CocoaDemo2026!';
const DEMO_USERS = [
  { email: 'admin@cocoashield.local', username: 'Awa.Kone', role: UserRole.ADMINISTRATEUR, cooperative: 'Cocoashield', kind: 'platform' },
  { email: 'admin.onpremise@ccc.ci', username: 'Admin.Local', role: UserRole.ADMINISTRATEUR, cooperative: 'Conseil du Café-Cacao', kind: 'onprem' },
  { email: 'agronome@ccc.ci', username: 'Agronome.CCC', role: UserRole.AGRONOME_TERRAIN, cooperative: 'Conseil du Café-Cacao', kind: 'onprem' },
  { email: 'direction@ccc.ci', username: 'Direction.CCC', role: UserRole.DIRECTION_CCC, cooperative: 'Conseil du Café-Cacao', kind: 'onprem' },
] as const;

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
  organizationId: string | null = null,
  configOwnerId: string = user.id,
) {
  const parcelRepo = dataSource.getRepository(Parcel);
  const missionRepo = dataSource.getRepository(Mission);
  const settingsRepo = dataSource.getRepository(PlatformSettings);
  const droneRepo = dataSource.getRepository(DroneProfile);
  const exportRepo = dataSource.getRepository(ExportRecord);
  const auditRepo = dataSource.getRepository(AuditLog);

  const existingParcels = await parcelRepo.find({
    where: { ownerId: user.id },
  });
  if (existingParcels.length) await parcelRepo.remove(existingParcels);
  await missionRepo.delete({ ownerId: user.id });
  await settingsRepo.delete({ ownerId: configOwnerId });
  await droneRepo.delete({ ownerId: configOwnerId });
  await exportRepo.delete({ userId: user.id });
  await auditRepo.delete({ userId: user.id });

  const now = Date.now();
  const mission1 = await missionRepo.save(
    missionRepo.create({
      ownerId: user.id,
      organizationId,
      name: 'Tournée Soubré · Secteur Nord',
      missionDate: new Date(now - 3 * 86400000),
      notes: 'Contrôle des foyers signalés et prises de vues terrain.',
    }),
  );
  const mission2 = await missionRepo.save(
    missionRepo.create({
      ownerId: user.id,
      organizationId,
      name: 'Campagne sanitaire · Semaine 31',
      missionDate: new Date(now - 18 * 86400000),
      notes: 'Échantillonnage régulier des feuilles et vérification terrain.',
    }),
  );
  const mission3 = await missionRepo.save(
    missionRepo.create({
      ownerId: user.id,
      organizationId,
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
      organizationId,
      name: 'Plantation Akouédo A-12',
      boundary: square(baseLng, baseLat),
      terrainVerificationStatus: TerrainVerificationStatus.VERIFIED,
      terrainVerificationComment:
        'Présence de symptômes confirmée sur la bordure est.',
      terrainVerifiedAt: new Date(now - 2 * 86400000),
    }),
    parcelRepo.create({
      ownerId: user.id,
      organizationId,
      name: 'Parcelle Nawa B-07',
      boundary: square(baseLng + 0.012, baseLat + 0.008, 0.006),
      terrainVerificationStatus: TerrainVerificationStatus.VERIFIED,
      terrainVerificationComment: 'Parcelle saine lors du dernier passage.',
      terrainVerifiedAt: new Date(now - 7 * 86400000),
    }),
    parcelRepo.create({
      ownerId: user.id,
      organizationId,
      name: 'Bloc Méagui C-04',
      boundary: square(baseLng - 0.011, baseLat + 0.016, 0.008),
      terrainVerificationStatus: TerrainVerificationStatus.PENDING,
      terrainVerificationComment: null,
      terrainVerifiedAt: null,
    }),
  ]);

  // Aucune analyse ni image ici : un verdict n'existe que s'il sort du modèle.
  // Les parcelles restent « non analysées » jusqu'au premier envoi d'images.
  await settingsRepo.save(
    settingsRepo.create({
      ownerId: configOwnerId,
      severityModerate: 0.1,
      severityHigh: 0.25,
      severityCritical: 0.4,
      clusteringRadiusM: 25,
      minImagesPerZone: 4,
    }),
  );
  await droneRepo.save(
    droneRepo.create({
      ownerId: configOwnerId,
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
      ownerId: configOwnerId,
      profileId: 'MOBILE-TERRAIN',
      manufacturer: 'Cocoashield',
      model: 'Mobile terrain',
      rtkPrecisionCm: null,
      metadataFormat: 'EXIF',
      active: true,
    }),
  );

  mission1.droneProfileId = 'DJI-M3M-RTK';
  mission1.parcelIds = [parcels[0].id, parcels[2].id];
  mission2.droneProfileId = 'MOBILE-TERRAIN';
  mission2.parcelIds = [parcels[1].id];
  mission3.droneProfileId = 'DJI-M3M-RTK';
  mission3.parcelIds = [parcels[0].id];
  await missionRepo.save([mission1, mission2, mission3]);

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
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const dataSource = app.get(DataSource);
  const usersService = app.get(UsersService);
  const authService = app.get(AuthService);
  const auth = authService.instance as unknown as Auth;
  const organizationRepo = dataSource.getRepository(Organization);

  let onPrem = await organizationRepo.findOne({ where: { name: 'Conseil du Café-Cacao' } });
  if (!onPrem) onPrem = await organizationRepo.save(organizationRepo.create({ name: 'Conseil du Café-Cacao', type: OrganizationType.DIRECTION, offer: ServiceOffer.ON_PREMISE, email: 'direction@ccc.ci', phone: '+225 27 20 00 00 00', active: true }));

  let onPremAdmin: { id: string; email: string } | null = null;
  for (const spec of DEMO_USERS) {
    const user = await ensureUser(auth, dataSource, spec.email, spec.username);
    const isPlatform = spec.kind === 'platform';
    const isOnPrem = spec.kind === 'onprem';
    await usersService.update(user.id, {
      role: spec.role,
      cooperative: spec.cooperative,
      organizationId: isOnPrem ? onPrem.id : null,
      managedOrganizationIds: spec.role === UserRole.ADMINISTRATEUR && isOnPrem ? [onPrem.id] : [],
      status: UserStatus.ACTIVE,
      isPlatformAdmin: isPlatform,
    });
    if (spec.email === 'admin.onpremise@ccc.ci') onPremAdmin = { id: user.id, email: spec.email };
  }

  if (onPremAdmin) await seedOwner(dataSource, onPremAdmin, 0, onPrem.id, `organization:${onPrem.id}`);

  console.log('\nDonnées CocoaShield On-Premise de démonstration prêtes.');
  console.log(`Mot de passe commun : ${DEMO_PASSWORD}`);
  for (const spec of DEMO_USERS) console.log(`- ${spec.email} (${spec.role})`);
  console.log('Parcours recommandé : admin.onpremise@ccc.ci → agronome@ccc.ci → direction@ccc.ci');
  await app.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
