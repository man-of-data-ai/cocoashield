import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PendingImport } from '../entities/pending-import.entity';

@Injectable()
export class PendingImportRepository {
  constructor(
    @InjectRepository(PendingImport)
    private readonly repository: Repository<PendingImport>,
  ) {}

  create(data: Partial<PendingImport>): Promise<PendingImport> {
    return this.repository.save(this.repository.create(data));
  }
}
