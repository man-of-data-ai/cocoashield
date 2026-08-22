import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateMissionDto } from './dtos/create-mission.dto';
import { Mission } from './entities/mission.entity';
import { MissionRepository } from './repositories/mission.repository';

@Injectable()
export class MissionsService {
  constructor(private readonly missionRepository: MissionRepository) {}

  create(ownerId: string, dto: CreateMissionDto): Promise<Mission> {
    return this.missionRepository.create({
      ownerId,
      name: dto.name,
      missionDate: dto.missionDate ? new Date(dto.missionDate) : new Date(),
      notes: dto.notes ?? null,
    });
  }

  findAllForOwner(ownerId: string): Promise<Mission[]> {
    return this.missionRepository.findByOwner(ownerId);
  }

  async findOneForOwner(id: string, ownerId: string): Promise<Mission> {
    const mission = await this.missionRepository.findByIdAndOwner(id, ownerId);
    if (!mission) {
      throw new NotFoundException('Mission not found');
    }
    return mission;
  }

  /**
   * Résout une mission à partir d'un id (doit exister) ou d'un nom
   * (créée à la volée si elle n'existe pas encore pour ce owner). Utilisé
   * lors de la création d'une analyse, où le client peut fournir l'un ou
   * l'autre.
   */
  async resolve(
    ownerId: string,
    missionId?: string | null,
    missionName?: string | null,
  ): Promise<Mission | null> {
    if (missionId) {
      return this.findOneForOwner(missionId, ownerId);
    }
    const trimmedName = missionName?.trim();
    if (!trimmedName) {
      return null;
    }
    const existing = await this.missionRepository.findByNameAndOwner(
      trimmedName,
      ownerId,
    );
    if (existing) {
      return existing;
    }
    return this.missionRepository.create({
      ownerId,
      name: trimmedName,
      missionDate: new Date(),
      notes: null,
    });
  }

  /**
   * Suppression réversible. Les analyses gardent leur `mission_id` : la
   * relation est en `SET NULL` uniquement sur suppression physique, que l'on
   * ne pratique pas ici.
   */
  async softDelete(id: string, ownerId: string): Promise<void> {
    await this.findOneForOwner(id, ownerId);
    await this.missionRepository.softDelete(id);
  }

  async restore(id: string, ownerId: string): Promise<Mission> {
    const mission = await this.missionRepository.findDeletedByIdAndOwner(
      id,
      ownerId,
    );
    if (!mission) {
      throw new NotFoundException('Mission introuvable.');
    }
    if (!mission.deletedAt) {
      throw new BadRequestException("Cette mission n'est pas supprimée.");
    }
    await this.missionRepository.restore(id);
    return this.findOneForOwner(id, ownerId);
  }
}
