import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditActor, AuditService } from '../audit/audit.service';
import { Organization, ServiceOffer } from '../organizations/entities/organization.entity';
import { UserRole } from '../users/entities/user-profile.entity';
import { UsersService } from '../users/users.service';
import { CreateDroneProfileDto } from './dtos/create-drone-profile.dto';
import { UpdateDroneProfileDto } from './dtos/update-drone-profile.dto';
import { UpdatePlatformSettingsDto } from './dtos/update-platform-settings.dto';
import { DroneProfile } from './entities/drone-profile.entity';
import { PlatformSettings } from './entities/platform-settings.entity';

const DEFAULT_SETTINGS = {
  severityLow: 0,
  severityModerate: 0.1,
  severityHigh: 0.25,
  severityCritical: 0.4,
  minimumConfidence: 0.75,
  clusteringRadiusM: 20,
  minImagesPerZone: 5,
  dedupDistanceM: 2,
  dedupWindowS: 10,
  refreshIntervalConnectedS: 2,
  batchRecalcMaxDelayMin: 5,
  syncRetryIntervalMin: 15,
  offlineTileCacheSizeMb: 250,
  historyRetentionMonths: 36,
  sessionDurationMinutes: 60,
};

type ConfigContext = {
  ownerId: string;
  mode: 'platform' | 'on_premise' | 'shared';
  canManage: boolean;
  organization: Organization | null;
};

@Injectable()
export class PlatformConfigService {
  constructor(
    @InjectRepository(PlatformSettings)
    private readonly settingsRepository: Repository<PlatformSettings>,
    @InjectRepository(DroneProfile)
    private readonly droneRepository: Repository<DroneProfile>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
  ) {}

  private async platformOwnerId(): Promise<string> {
    const rows = await this.dataSource.query(`SELECT user_id FROM app_user_profile WHERE is_platform_admin = true AND status = 'active' ORDER BY created_at ASC LIMIT 1`).catch(() => []);
    return rows[0]?.user_id ?? 'cocoashield-platform';
  }

  private async resolveContext(userId: string): Promise<ConfigContext> {
    const scope = await this.usersService.getAccessScope(userId);
    if (scope.isPlatformAdmin) {
      return { ownerId: await this.platformOwnerId(), mode: 'platform', canManage: true, organization: null };
    }

    const organizationId = scope.primaryOrganizationId ?? scope.organizationIds[0] ?? null;
    const organization = organizationId ? await this.organizationRepository.findOne({ where: { id: organizationId } }) : null;
    if (organization?.offer === ServiceOffer.ON_PREMISE) {
      return {
        ownerId: `organization:${organization.id}`,
        mode: 'on_premise',
        canManage: scope.role === UserRole.ADMINISTRATEUR,
        organization,
      };
    }

    return {
      ownerId: await this.platformOwnerId(),
      mode: 'shared',
      canManage: false,
      organization,
    };
  }

  private async requireManager(userId: string): Promise<ConfigContext> {
    const context = await this.resolveContext(userId);
    if (!context.canManage) {
      throw new ForbiddenException('La configuration est réservée à l’administrateur CocoaShield ou à l’administrateur local d’une instance On-Premise.');
    }
    return context;
  }

  private async ensureSettings(ownerId: string): Promise<PlatformSettings> {
    let settings = await this.settingsRepository.findOne({ where: { ownerId } });
    if (!settings) {
      settings = await this.settingsRepository.save(this.settingsRepository.create({ ownerId, ...DEFAULT_SETTINGS }));
    }
    return settings;
  }

  private async bootstrapLocalDroneProfiles(localOwnerId: string): Promise<void> {
    if (await this.droneRepository.count({ where: { ownerId: localOwnerId } })) return;
    const platformOwnerId = await this.platformOwnerId();
    const shared = await this.droneRepository.find({ where: { ownerId: platformOwnerId } });
    if (!shared.length) return;
    await this.droneRepository.save(shared.map((profile) => this.droneRepository.create({
      ownerId: localOwnerId,
      profileId: profile.profileId,
      manufacturer: profile.manufacturer,
      model: profile.model,
      vectorType: profile.vectorType,
      supportsRtk: profile.supportsRtk,
      rtkPrecisionCm: profile.rtkPrecisionCm,
      rtkFloatPrecisionCm: profile.rtkFloatPrecisionCm,
      noCorrectionPrecisionM: profile.noCorrectionPrecisionM,
      metadataFormat: profile.metadataFormat,
      latitudeField: profile.latitudeField,
      longitudeField: profile.longitudeField,
      absoluteAltitudeField: profile.absoluteAltitudeField,
      relativeAltitudeField: profile.relativeAltitudeField,
      orientationFields: profile.orientationFields,
      timestampField: profile.timestampField,
      rtkStatusField: profile.rtkStatusField,
      rtkStatusMapping: profile.rtkStatusMapping,
      nativeMissionExport: profile.nativeMissionExport,
      active: profile.active,
    })));
  }

  async getSettings(userId: string): Promise<PlatformSettings> {
    const context = await this.resolveContext(userId);
    return this.ensureSettings(context.ownerId);
  }

  async updateSettings(userId: string, dto: UpdatePlatformSettingsDto, actor?: AuditActor): Promise<PlatformSettings> {
    const context = await this.requireManager(userId);
    if (!(dto.severityLow <= dto.severityModerate && dto.severityModerate < dto.severityHigh && dto.severityHigh < dto.severityCritical)) {
      throw new BadRequestException('Severity thresholds must be strictly increasing');
    }
    const settings = await this.ensureSettings(context.ownerId);
    const before = {
      severityLow: settings.severityLow,
      severityModerate: settings.severityModerate,
      severityHigh: settings.severityHigh,
      severityCritical: settings.severityCritical,
      clusteringRadiusM: settings.clusteringRadiusM,
      minImagesPerZone: settings.minImagesPerZone,
      minimumConfidence: settings.minimumConfidence,
      dedupDistanceM: settings.dedupDistanceM,
      dedupWindowS: settings.dedupWindowS,
      refreshIntervalConnectedS: settings.refreshIntervalConnectedS,
      batchRecalcMaxDelayMin: settings.batchRecalcMaxDelayMin,
      syncRetryIntervalMin: settings.syncRetryIntervalMin,
      offlineTileCacheSizeMb: settings.offlineTileCacheSizeMb,
      historyRetentionMonths: settings.historyRetentionMonths,
      sessionDurationMinutes: settings.sessionDurationMinutes,
    };
    Object.assign(settings, dto);
    const saved = await this.settingsRepository.save(settings);
    if (actor) {
      await this.auditService.log({
        ...actor,
        action: 'configuration.settings.updated',
        targetType: 'configuration',
        targetId: saved.id,
        targetLabel: context.mode === 'on_premise' ? `Configuration locale · ${context.organization?.name ?? 'On-Premise'}` : 'Configuration plateforme',
        details: { before, after: dto, mode: context.mode, organizationId: context.organization?.id ?? null },
      });
    }
    return saved;
  }

  async listDroneProfiles(userId: string, activeOnly = false): Promise<DroneProfile[]> {
    const context = await this.resolveContext(userId);
    if (context.mode === 'on_premise') await this.bootstrapLocalDroneProfiles(context.ownerId);
    return this.droneRepository.find({
      where: activeOnly ? { ownerId: context.ownerId, active: true } : { ownerId: context.ownerId },
      order: { manufacturer: 'ASC', model: 'ASC' },
    });
  }

  async getActiveDroneProfile(userId: string, profileId: string): Promise<DroneProfile> {
    const context = await this.resolveContext(userId);
    if (context.mode === 'on_premise') await this.bootstrapLocalDroneProfiles(context.ownerId);
    const profile = await this.droneRepository.findOne({ where: { ownerId: context.ownerId, profileId, active: true } });
    if (!profile) throw new BadRequestException(`Unknown or inactive profile_id: ${profileId}`);
    return profile;
  }

  async createDroneProfile(actorId: string, dto: CreateDroneProfileDto, actor?: AuditActor): Promise<DroneProfile> {
    const context = await this.requireManager(actorId);
    if (context.mode === 'on_premise') await this.bootstrapLocalDroneProfiles(context.ownerId);
    const existing = await this.droneRepository.findOne({ where: { ownerId: context.ownerId, profileId: dto.profileId } });
    if (existing) throw new BadRequestException('profile_id already exists');
    const saved = await this.droneRepository.save(this.droneRepository.create({ ownerId: context.ownerId, ...dto, active: dto.active ?? true }));
    if (actor) await this.auditService.log({ ...actor, action: 'drone_profile.created', targetType: 'drone_profile', targetId: saved.id, targetLabel: `${saved.manufacturer} ${saved.model} (${saved.profileId})`, details: { profileId: saved.profileId, active: saved.active, metadataFormat: saved.metadataFormat, mode: context.mode, organizationId: context.organization?.id ?? null } });
    return saved;
  }

  async updateDroneProfile(actorId: string, id: string, dto: UpdateDroneProfileDto, actor?: AuditActor): Promise<DroneProfile> {
    const context = await this.requireManager(actorId);
    if (context.mode === 'on_premise') await this.bootstrapLocalDroneProfiles(context.ownerId);
    const profile = await this.droneRepository.findOne({ where: { id, ownerId: context.ownerId } });
    if (!profile) throw new NotFoundException('Drone profile not found');
    if (dto.profileId && dto.profileId !== profile.profileId) {
      const duplicate = await this.droneRepository.findOne({ where: { ownerId: context.ownerId, profileId: dto.profileId } });
      if (duplicate) throw new BadRequestException('profile_id already exists');
    }
    const before = { profileId: profile.profileId, active: profile.active, manufacturer: profile.manufacturer, model: profile.model };
    Object.assign(profile, dto);
    const saved = await this.droneRepository.save(profile);
    if (actor) await this.auditService.log({ ...actor, action: saved.active ? 'drone_profile.updated' : 'drone_profile.deactivated', targetType: 'drone_profile', targetId: saved.id, targetLabel: `${saved.manufacturer} ${saved.model} (${saved.profileId})`, details: { before, after: dto, mode: context.mode, organizationId: context.organization?.id ?? null } });
    return saved;
  }
}
