import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '../../libs/infrastructure/config/config.module';
import { Analysis } from '../analyses/entities/analysis.entity';
import { AnalysisImage } from '../analyses/entities/analysis-image.entity';
import { Mission } from '../missions/entities/mission.entity';
import { Parcel } from '../parcels/entities/parcel.entity';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { AuditModule } from '../audit/audit.module';
import { ExportRecord } from './entities/export-record.entity';

@Module({
  imports: [
    ConfigModule,
    AuditModule,
    TypeOrmModule.forFeature([
      ExportRecord,
      Parcel,
      Analysis,
      AnalysisImage,
      Mission,
    ]),
  ],
  controllers: [ExportsController],
  providers: [ExportsService],
})
export class ExportsModule {}
