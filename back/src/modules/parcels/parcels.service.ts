import { Injectable, NotFoundException } from '@nestjs/common';
import { Parcel, ParcelStatus, TerrainVerificationStatus } from './entities/parcel.entity';
import { CreateParcelDto } from './dtos/create-parcel.dto';
import { ParcelRepository } from './repositories/parcel.repository';
import { AuditActor, AuditService } from '../audit/audit.service';

@Injectable()
export class ParcelsService {
  constructor(
    private readonly parcelRepository: ParcelRepository,
    private readonly auditService: AuditService,
  ) {}

  async create(ownerId: string, dto: CreateParcelDto, actor?: AuditActor): Promise<Parcel> {
    const ring = this.closeRing(dto.coordinates);

    const parcel = await this.parcelRepository.create({
      ownerId,
      name: dto.name,
      boundary: { type: 'Polygon', coordinates: [ring] },
      status: ParcelStatus.NOT_ANALYZED,
    });
    if (actor) {
      await this.auditService.log({ ...actor, action: 'parcel.created', targetType: 'parcel', targetId: parcel.id, targetLabel: parcel.name, details: { coordinateCount: ring.length } });
    }
    return parcel;
  }

  findAllForOwner(ownerId: string): Promise<Parcel[]> {
    return this.parcelRepository.findByOwner(ownerId);
  }

  async findOneForOwner(id: string, ownerId: string, actor?: AuditActor): Promise<Parcel> {
    const parcel = await this.parcelRepository.findByIdAndOwner(id, ownerId);
    if (!parcel) {
      throw new NotFoundException('Parcel not found');
    }
    if (actor) {
      await this.auditService.log({ ...actor, action: 'parcel.consulted', targetType: 'parcel', targetId: parcel.id, targetLabel: parcel.name, details: { status: parcel.status } });
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
    actor?: AuditActor,
  ): Promise<Parcel> {
    await this.findOneForOwner(id, ownerId);
    await this.parcelRepository.updateVerification(id, {
      terrainVerificationStatus: status,
      terrainVerificationComment: comment?.trim() || null,
      terrainVerifiedAt:
        status === TerrainVerificationStatus.PENDING ? null : new Date(),
    });
    const parcel = await this.findOneForOwner(id, ownerId);
    if (actor) {
      await this.auditService.log({
        ...actor,
        action: status === TerrainVerificationStatus.VERIFIED ? 'parcel.verified' : status === TerrainVerificationStatus.FALSE_POSITIVE ? 'parcel.false_positive' : 'parcel.verification.reset',
        targetType: 'parcel',
        targetId: parcel.id,
        targetLabel: parcel.name,
        details: { verificationStatus: status, comment: comment?.trim() || null },
      });
    }
    return parcel;
  }

  private closeRing(points: [number, number][]): number[][] {
    const [first] = points;
    const last = points[points.length - 1];
    const isClosed = first[0] === last[0] && first[1] === last[1];
    return isClosed ? points : [...points, first];
  }
}
