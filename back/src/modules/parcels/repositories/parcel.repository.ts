import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Parcel } from '../entities/parcel.entity';

@Injectable()
export class ParcelRepository {
  constructor(
    @InjectRepository(Parcel)
    private readonly repository: Repository<Parcel>,
  ) {}

  create(data: Partial<Parcel>): Promise<Parcel> {
    return this.repository.save(this.repository.create(data));
  }

  findAccessible(actorId: string, organizationIds: string[], isPlatformAdmin: boolean): Promise<Parcel[]> {
    return this.repository.find({
      where: isPlatformAdmin
        ? undefined
        : organizationIds.length
          ? [{ organizationId: In(organizationIds) }, { ownerId: actorId, organizationId: IsNull() }]
          : { ownerId: actorId, organizationId: IsNull() },
      relations: { analyses: { images: true, mission: true } },
      order: {
        createdAt: 'DESC',
        analyses: { createdAt: 'DESC' },
      },
    });
  }

  findByIdAccessible(id: string, actorId: string, organizationIds: string[], isPlatformAdmin: boolean): Promise<Parcel | null> {
    return this.repository.findOne({
      where: isPlatformAdmin
        ? { id }
        : organizationIds.length
          ? [{ id, organizationId: In(organizationIds) }, { id, ownerId: actorId, organizationId: IsNull() }]
          : { id, ownerId: actorId, organizationId: IsNull() },
      relations: { analyses: { images: true, mission: true } },
      order: { analyses: { createdAt: 'DESC' } },
    });
  }

  async updateStatus(id: string, status: Parcel['status']): Promise<void> {
    await this.repository.update(id, { status });
  }

  async updateVerification(
    id: string,
    data: Pick<Parcel, 'terrainVerificationStatus' | 'terrainVerificationComment' | 'terrainVerifiedAt'>,
  ): Promise<void> {
    await this.repository.update(id, data);
  }
}
