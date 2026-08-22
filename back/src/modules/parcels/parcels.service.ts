import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateParcelDto } from './dtos/create-parcel.dto';
import {
  Parcel,
  ParcelStatus,
  TerrainVerificationStatus,
} from './entities/parcel.entity';
import { ParcelRepository } from './repositories/parcel.repository';

@Injectable()
export class ParcelsService {
  constructor(private readonly parcelRepository: ParcelRepository) {}

  create(ownerId: string, dto: CreateParcelDto): Promise<Parcel> {
    return this.parcelRepository.create({
      ownerId,
      name: dto.name,
      boundary: {
        type: 'Polygon',
        coordinates: [this.closeRing(dto.coordinates)],
      },
      status: ParcelStatus.NOT_ANALYZED,
    });
  }

  findAllForOwner(ownerId: string): Promise<Parcel[]> {
    return this.parcelRepository.findByOwner(ownerId);
  }

  /**
   * Charge une parcelle en vérifiant qu'elle appartient bien à l'appelant.
   * Le propriétaire est porté par la requête : aucun filtrage en mémoire
   * après chargement, sans quoi une parcelle tierce transiterait déjà.
   */
  async findOneForOwner(id: string, ownerId: string): Promise<Parcel> {
    const parcel = await this.parcelRepository.findByIdAndOwner(id, ownerId);
    if (!parcel) {
      throw new NotFoundException('Parcelle introuvable.');
    }
    return parcel;
  }

  updateStatus(id: string, status: ParcelStatus): Promise<void> {
    return this.parcelRepository.updateStatus(id, status);
  }

  async updateVerification(
    id: string,
    ownerId: string,
    status: TerrainVerificationStatus,
    comment?: string,
  ): Promise<Parcel> {
    await this.findOneForOwner(id, ownerId);

    await this.parcelRepository.updateVerification(id, {
      terrainVerificationStatus: status,
      terrainVerificationComment: comment?.trim() || null,
      terrainVerifiedAt:
        status === TerrainVerificationStatus.PENDING ? null : new Date(),
    });

    return this.findOneForOwner(id, ownerId);
  }

  private closeRing(points: [number, number][]): number[][] {
    const [first] = points;
    const last = points[points.length - 1];
    const isClosed = first[0] === last[0] && first[1] === last[1];
    return isClosed ? points : [...points, first];
  }
}
