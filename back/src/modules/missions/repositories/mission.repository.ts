import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mission } from '../entities/mission.entity';

@Injectable()
export class MissionRepository {
  constructor(
    @InjectRepository(Mission)
    private readonly repository: Repository<Mission>,
  ) {}

  create(data: Partial<Mission>): Promise<Mission> {
    return this.repository.save(this.repository.create(data));
  }

  findByOwner(ownerId: string): Promise<Mission[]> {
    return this.repository.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
  }

  findByIdAndOwner(id: string, ownerId: string): Promise<Mission | null> {
    return this.repository.findOne({ where: { id, ownerId } });
  }

  findByNameAndOwner(name: string, ownerId: string): Promise<Mission | null> {
    return this.repository.findOne({ where: { name, ownerId } });
  }

  /** Recherche incluant les missions supprimées — réservé à la restauration. */
  findDeletedByIdAndOwner(
    id: string,
    ownerId: string,
  ): Promise<Mission | null> {
    return this.repository.findOne({
      where: { id, ownerId },
      withDeleted: true,
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  async restore(id: string): Promise<void> {
    await this.repository.restore(id);
  }
}
