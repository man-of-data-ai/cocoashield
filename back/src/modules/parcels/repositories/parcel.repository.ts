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

  /**
   * Liste des parcelles avec leurs analyses, sans les images.
   *
   * Les images ne sont pas hydratées ici : la sévérité et le taux
   * d'infection sont déjà calculés et stockés sur l'analyse, la liste n'a
   * donc pas besoin de charger chaque ligne d'image.
   */
  findByOwner(ownerId: string): Promise<Parcel[]> {
    return this.repository.find({
      where: { ownerId },
      relations: { analyses: { mission: true } },
      order: {
        createdAt: 'DESC',
        analyses: { createdAt: 'DESC' },
      },
    });
  }

  findByIdAndOwner(id: string, ownerId: string): Promise<Parcel | null> {
    return this.repository.findOne({
      where: { id, ownerId },
      relations: { analyses: { images: true, mission: true } },
      order: { analyses: { createdAt: 'DESC' } },
    });
  }

  async updateStatus(id: string, status: Parcel['status']): Promise<void> {
    await this.repository.update(id, { status });
  }

  /**
   * Recherche incluant les parcelles supprimées — réservé à la restauration.
   */
  findDeletedByIdAndOwner(id: string, ownerId: string): Promise<Parcel | null> {
    return this.repository.findOne({
      where: { id, ownerId },
      withDeleted: true,
    });
  }

  /** Soft delete : la parcelle et ses analyses restent en base. */
  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  async restore(id: string): Promise<void> {
    await this.repository.restore(id);
  }

  async updateVerification(
    id: string,
    data: Pick<
      Parcel,
      | 'terrainVerificationStatus'
      | 'terrainVerificationComment'
      | 'terrainVerifiedAt'
    >,
  ): Promise<void> {
    await this.repository.update(id, data);
  }
}
