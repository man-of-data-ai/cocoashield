import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDroneProfileDto } from './dtos/create-drone-profile.dto';
import { UpdateDroneProfileDto } from './dtos/update-drone-profile.dto';
import { UpdatePlatformSettingsDto } from './dtos/update-platform-settings.dto';
import { DroneProfile } from './entities/drone-profile.entity';
import { PlatformSettings } from './entities/platform-settings.entity';
import { SeverityThresholds } from './severity';

const DEFAULT_SETTINGS = {
  severityModerate: 0.1,
  severityHigh: 0.25,
  severityCritical: 0.4,
  clusteringRadiusM: 20,
  minImagesPerZone: 5,
} as const;

@Injectable()
export class PlatformConfigService {
  constructor(
    @InjectRepository(PlatformSettings)
    private readonly settingsRepository: Repository<PlatformSettings>,
    @InjectRepository(DroneProfile)
    private readonly droneRepository: Repository<DroneProfile>,
  ) {}

  /**
   * Lecture des réglages. Une absence de ligne renvoie les valeurs par
   * défaut sans écrire : une lecture ne doit pas créer d'état, et deux
   * requêtes concurrentes violeraient la contrainte d'unicité.
   */
  async getSettings(ownerId: string): Promise<PlatformSettings> {
    const settings = await this.settingsRepository.findOne({
      where: { ownerId },
    });
    return (
      settings ??
      this.settingsRepository.create({ ownerId, ...DEFAULT_SETTINGS })
    );
  }

  /** Seuils de sévérité applicables à un propriétaire, en taux (0 → 1). */
  async getSeverityThresholds(ownerId: string): Promise<SeverityThresholds> {
    const settings = await this.getSettings(ownerId);
    return {
      moderate: settings.severityModerate,
      high: settings.severityHigh,
      critical: settings.severityCritical,
    };
  }

  async updateSettings(
    ownerId: string,
    dto: UpdatePlatformSettingsDto,
  ): Promise<PlatformSettings> {
    if (!(
      dto.severityModerate < dto.severityHigh &&
      dto.severityHigh < dto.severityCritical
    )) {
      throw new BadRequestException(
        'Les seuils de sévérité doivent être strictement croissants.',
      );
    }

    const settings = await this.getSettings(ownerId);
    Object.assign(settings, dto);
    return this.settingsRepository.save(settings);
  }

  listDroneProfiles(
    ownerId: string,
    activeOnly = false,
  ): Promise<DroneProfile[]> {
    return this.droneRepository.find({
      where: activeOnly ? { ownerId, active: true } : { ownerId },
      order: { manufacturer: 'ASC', model: 'ASC' },
    });
  }

  async getActiveDroneProfile(
    ownerId: string,
    profileId: string,
  ): Promise<DroneProfile> {
    const profile = await this.droneRepository.findOne({
      where: { ownerId, profileId, active: true },
    });
    if (!profile) {
      throw new BadRequestException(
        `Profil drone inconnu ou inactif : ${profileId}`,
      );
    }
    return profile;
  }

  async createDroneProfile(
    ownerId: string,
    dto: CreateDroneProfileDto,
  ): Promise<DroneProfile> {
    const existing = await this.droneRepository.findOne({
      where: { ownerId, profileId: dto.profileId },
    });
    if (existing) {
      throw new BadRequestException('Ce profil drone existe déjà.');
    }
    return this.droneRepository.save(
      this.droneRepository.create({
        ownerId,
        ...dto,
        active: dto.active ?? true,
      }),
    );
  }

  async updateDroneProfile(
    ownerId: string,
    id: string,
    dto: UpdateDroneProfileDto,
  ): Promise<DroneProfile> {
    const profile = await this.droneRepository.findOne({
      where: { id, ownerId },
    });
    if (!profile) {
      throw new NotFoundException('Profil drone introuvable.');
    }
    if (dto.profileId && dto.profileId !== profile.profileId) {
      const duplicate = await this.droneRepository.findOne({
        where: { ownerId, profileId: dto.profileId },
      });
      if (duplicate) {
        throw new BadRequestException('Ce profil drone existe déjà.');
      }
    }
    Object.assign(profile, dto);
    return this.droneRepository.save(profile);
  }

  /**
   * Suppression réversible d'un profil drone. Les analyses conservent leur
   * `profile_id` : elles documentent le matériel réellement utilisé, y
   * compris pour un profil retiré du catalogue.
   */
  async softDeleteDroneProfile(ownerId: string, id: string): Promise<void> {
    const profile = await this.droneRepository.findOne({
      where: { id, ownerId },
    });
    if (!profile) {
      throw new NotFoundException('Profil drone introuvable.');
    }
    await this.droneRepository.softDelete(id);
  }

  async restoreDroneProfile(
    ownerId: string,
    id: string,
  ): Promise<DroneProfile> {
    const profile = await this.droneRepository.findOne({
      where: { id, ownerId },
      withDeleted: true,
    });
    if (!profile) {
      throw new NotFoundException('Profil drone introuvable.');
    }
    if (!profile.deletedAt) {
      throw new BadRequestException("Ce profil drone n'est pas supprimé.");
    }
    await this.droneRepository.restore(id);
    profile.deletedAt = null;
    return profile;
  }
}
