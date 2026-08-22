import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '../../libs/infrastructure/config/config.module';
import { AuditModule } from '../audit/audit.module';
import { Parcel } from '../parcels/entities/parcel.entity';
import { ExportRecord } from './entities/export-record.entity';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';

@Module({
  imports: [
    ConfigModule,
    AuditModule,
    TypeOrmModule.forFeature([ExportRecord, Parcel]),
  ],
  controllers: [ExportsController],
  providers: [ExportsService],
})
export class ExportsModule {}
