import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
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

  findAccessible(actorId: string, organizationIds: string[], isPlatformAdmin: boolean): Promise<Mission[]> {
    return this.repository.find({
      where: isPlatformAdmin
        ? undefined
        : organizationIds.length
          ? [{ organizationId: In(organizationIds) }, { ownerId: actorId, organizationId: IsNull() }]
          : { ownerId: actorId, organizationId: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  findByIdAccessible(id: string, actorId: string, organizationIds: string[], isPlatformAdmin: boolean): Promise<Mission | null> {
    return this.repository.findOne({
      where: isPlatformAdmin
        ? { id }
        : organizationIds.length
          ? [{ id, organizationId: In(organizationIds) }, { id, ownerId: actorId, organizationId: IsNull() }]
          : { id, ownerId: actorId, organizationId: IsNull() },
    });
  }

  async updateNotes(id: string, notes: string | null): Promise<void> {
    await this.repository.update(id, { notes });
  }

  findByNameAndOwner(name: string, ownerId: string): Promise<Mission | null> {
    return this.repository.findOne({ where: { name, ownerId } });
  }
}
