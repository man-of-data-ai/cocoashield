import { Injectable, NotFoundException } from '@nestjs/common';
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
}
