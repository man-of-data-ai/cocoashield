import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  findByOwner(ownerId: string): Promise<Parcel[]> {
    return this.repository.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
  }

  findByIdAndOwner(id: string, ownerId: string): Promise<Parcel | null> {
    return this.repository.findOne({
      where: { id, ownerId },
      relations: { analyses: { images: true } },
      order: { analyses: { createdAt: 'DESC' } },
    });
  }

  async updateStatus(id: string, status: Parcel['status']): Promise<void> {
    await this.repository.update(id, { status });
  }
}
