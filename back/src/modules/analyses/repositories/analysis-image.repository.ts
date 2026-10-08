import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, IsNull, Repository } from 'typeorm';
import {
  AnalysisImage,
  AnalysisImageSource,
} from '../entities/analysis-image.entity';

@Injectable()
export class AnalysisImageRepository {
  constructor(
    @InjectRepository(AnalysisImage)
    private readonly repository: Repository<AnalysisImage>,
  ) {}

  create(data: Partial<AnalysisImage>): Promise<AnalysisImage> {
    return this.repository.save(this.repository.create(data));
  }

  findById(id: string): Promise<AnalysisImage | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByIdWithOwner(id: string): Promise<AnalysisImage | null> {
    return this.repository.findOne({
      where: { id },
      relations: { analysis: { parcel: true } },
    });
  }

  /**
   * Sans périmètre : toutes les captures (super-admin). Sinon, celles des
   * parcelles accessibles et celles hors parcelle envoyées par `authorIds`.
   */
  // ponytail: 200 dernières captures sans pagination, paginer si l'onglet en a besoin
  findRecentMobile(scope?: { parcelIds: string[]; authorIds: string[] }): Promise<AnalysisImage[]> {
    const source = AnalysisImageSource.MOBILE;
    let where: FindOptionsWhere<AnalysisImage>[] = [{ source }];
    if (scope) {
      where = [];
      if (scope.parcelIds.length) where.push({ source, analysis: { parcelId: In(scope.parcelIds) } });
      if (scope.authorIds.length) where.push({ source, analysis: { parcelId: IsNull(), ownerId: In(scope.authorIds) } });
      if (!where.length) return Promise.resolve([]);
    }
    return this.repository.find({
      where,
      relations: { analysis: { parcel: true } },
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async update(id: string, data: Partial<AnalysisImage>): Promise<void> {
    await this.repository.update(id, data);
  }
}
