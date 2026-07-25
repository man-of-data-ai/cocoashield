import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Analysis } from '../entities/analysis.entity';

@Injectable()
export class AnalysisRepository {
  constructor(
    @InjectRepository(Analysis)
    private readonly repository: Repository<Analysis>,
  ) {}

  create(data: Partial<Analysis>): Promise<Analysis> {
    return this.repository.save(this.repository.create(data));
  }

  findById(id: string): Promise<Analysis | null> {
    return this.repository.findOne({
      where: { id },
      relations: { images: true, parcel: true },
    });
  }

  async update(id: string, data: Partial<Analysis>): Promise<void> {
    await this.repository.update(id, data);
  }
}
