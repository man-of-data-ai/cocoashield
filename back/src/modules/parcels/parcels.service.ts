import { Injectable, NotFoundException } from '@nestjs/common';
import { Parcel, ParcelStatus } from './entities/parcel.entity';
import { CreateParcelDto } from './dtos/create-parcel.dto';
import { ParcelRepository } from './repositories/parcel.repository';

@Injectable()
export class ParcelsService {
  constructor(private readonly parcelRepository: ParcelRepository) {}

  create(ownerId: string, dto: CreateParcelDto): Promise<Parcel> {
    const ring = this.closeRing(dto.coordinates);

    return this.parcelRepository.create({
      ownerId,
      name: dto.name,
      boundary: { type: 'Polygon', coordinates: [ring] },
      status: ParcelStatus.NOT_ANALYZED,
    });
  }

  findAllForOwner(ownerId: string): Promise<Parcel[]> {
    return this.parcelRepository.findByOwner(ownerId);
  }

  async findOneForOwner(id: string, ownerId: string): Promise<Parcel> {
    const parcel = await this.parcelRepository.findByIdAndOwner(id, ownerId);
    if (!parcel) {
      throw new NotFoundException('Parcel not found');
    }
    return parcel;
  }

  updateStatus(id: string, status: ParcelStatus): Promise<void> {
    return this.parcelRepository.updateStatus(id, status);
  }

  private closeRing(points: [number, number][]): number[][] {
    const [first] = points;
    const last = points[points.length - 1];
    const isClosed = first[0] === last[0] && first[1] === last[1];
    return isClosed ? points : [...points, first];
  }
}
