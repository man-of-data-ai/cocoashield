import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalysisImage } from '../entities/analysis-image.entity';

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

  async update(id: string, data: Partial<AnalysisImage>): Promise<void> {
    await this.repository.update(id, data);
  }
}
