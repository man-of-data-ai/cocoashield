import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditActor, AuditService } from '../audit/audit.service';
import { CreateDroneProfileDto } from './dtos/create-drone-profile.dto';
import { UpdateDroneProfileDto } from './dtos/update-drone-profile.dto';
import { UpdatePlatformSettingsDto } from './dtos/update-platform-settings.dto';
import { DroneProfile } from './entities/drone-profile.entity';
import { PlatformSettings } from './entities/platform-settings.entity';

const DEFAULT_SETTINGS = {
  severityModerate: 0.1,
  severityHigh: 0.25,
  severityCritical: 0.4,
  clusteringRadiusM: 20,
  minImagesPerZone: 5,
};

@Injectable()
export class PlatformConfigService {
  constructor(
    @InjectRepository(PlatformSettings)
    private readonly settingsRepository: Repository<PlatformSettings>,
    @InjectRepository(DroneProfile)
    private readonly droneRepository: Repository<DroneProfile>,
    private readonly auditService: AuditService,
  ) {}

  async getSettings(ownerId: string): Promise<PlatformSettings> {
    let settings = await this.settingsRepository.findOne({ where: { ownerId } });
    if (!settings) {
      settings = this.settingsRepository.create({ ownerId, ...DEFAULT_SETTINGS });
      settings = await this.settingsRepository.save(settings);
    }
    return settings;
  }

  async updateSettings(ownerId: string, dto: UpdatePlatformSettingsDto, actor?: AuditActor): Promise<PlatformSettings> {
    if (!(dto.severityModerate < dto.severityHigh && dto.severityHigh < dto.severityCritical)) {
      throw new BadRequestException('Severity thresholds must be strictly increasing');
    }
    const settings = await this.getSettings(ownerId);
    const before = {
      severityModerate: settings.severityModerate,
      severityHigh: settings.severityHigh,
      severityCritical: settings.severityCritical,
      clusteringRadiusM: settings.clusteringRadiusM,
      minImagesPerZone: settings.minImagesPerZone,
    };
    Object.assign(settings, dto);
    const saved = await this.settingsRepository.save(settings);
    if (actor) {
      await this.auditService.log({
        ...actor,
        action: 'configuration.settings.updated',
        targetType: 'configuration',
        targetId: saved.id,
        targetLabel: 'Seuils de sévérité et clustering',
        details: { before, after: dto },
      });
    }
    return saved;
  }

  listDroneProfiles(ownerId: string, activeOnly = false): Promise<DroneProfile[]> {
    return this.droneRepository.find({
      where: activeOnly ? { ownerId, active: true } : { ownerId },
      order: { manufacturer: 'ASC', model: 'ASC' },
    });
  }

  async getActiveDroneProfile(ownerId: string, profileId: string): Promise<DroneProfile> {
    const profile = await this.droneRepository.findOne({ where: { ownerId, profileId, active: true } });
    if (!profile) throw new BadRequestException(`Unknown or inactive profile_id: ${profileId}`);
    return profile;
  }

  async createDroneProfile(ownerId: string, dto: CreateDroneProfileDto, actor?: AuditActor): Promise<DroneProfile> {
    const existing = await this.droneRepository.findOne({ where: { ownerId, profileId: dto.profileId } });
    if (existing) throw new BadRequestException('profile_id already exists');
    const saved = await this.droneRepository.save(this.droneRepository.create({ ownerId, ...dto, active: dto.active ?? true }));
    if (actor) {
      await this.auditService.log({
        ...actor,
        action: 'drone_profile.created',
        targetType: 'drone_profile',
        targetId: saved.id,
        targetLabel: `${saved.manufacturer} ${saved.model} (${saved.profileId})`,
        details: { profileId: saved.profileId, active: saved.active, metadataFormat: saved.metadataFormat },
      });
    }
    return saved;
  }

  async updateDroneProfile(ownerId: string, id: string, dto: UpdateDroneProfileDto, actor?: AuditActor): Promise<DroneProfile> {
    const profile = await this.droneRepository.findOne({ where: { id, ownerId } });
    if (!profile) throw new NotFoundException('Drone profile not found');
    if (dto.profileId && dto.profileId !== profile.profileId) {
      const duplicate = await this.droneRepository.findOne({ where: { ownerId, profileId: dto.profileId } });
      if (duplicate) throw new BadRequestException('profile_id already exists');
    }
    const before = { profileId: profile.profileId, active: profile.active, manufacturer: profile.manufacturer, model: profile.model };
    Object.assign(profile, dto);
    const saved = await this.droneRepository.save(profile);
    if (actor) {
      await this.auditService.log({
        ...actor,
        action: saved.active ? 'drone_profile.updated' : 'drone_profile.deactivated',
        targetType: 'drone_profile',
        targetId: saved.id,
        targetLabel: `${saved.manufacturer} ${saved.model} (${saved.profileId})`,
        details: { before, after: dto },
      });
    }
    return saved;
  }
}
