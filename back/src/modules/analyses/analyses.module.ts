import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import * as fs from 'fs';
import { ConfigModule } from '../../core/config/config.module';
import { ConfigService } from '../../core/config/services/config.service';
import { AuditModule } from '../audit/audit.module';
import { MissionsModule } from '../missions/missions.module';
import { ParcelsModule } from '../parcels/parcels.module';
import { PlatformConfigModule } from '../platform-config/platform-config.module';
import { IMAGE_INFERENCE_QUEUE } from './analyses.constants';
import {
  AnalysesController,
  AnalysisImagesController,
  ParcelAnalysesController,
} from './analyses.controller';
import { AnalysesService } from './analyses.service';
import { AnalysisImage } from './entities/analysis-image.entity';
import { Analysis } from './entities/analysis.entity';
import { ImageGeoService } from './image-geo.service';
import { ImageInferenceProcessor } from './image-inference.processor';
import { ImageInferenceService } from './image-inference.service';
import { AnalysisImageRepository } from './repositories/analysis-image.repository';
import { AnalysisRepository } from './repositories/analysis.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Analysis, AnalysisImage]),
    AuditModule,
    ParcelsModule,
    MissionsModule,
    PlatformConfigModule,
    BullModule.registerQueue({ name: IMAGE_INFERENCE_QUEUE }),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        fs.mkdirSync(config.uploadsDir, { recursive: true });
        return {
          storage: diskStorage({
            destination: config.uploadsDir,
            filename: (_req, file, callback) => {
              callback(null, `${randomUUID()}${extname(file.originalname)}`);
            },
          }),
        };
      },
    }),
  ],
  controllers: [
    ParcelAnalysesController,
    AnalysesController,
    AnalysisImagesController,
  ],
  providers: [
    AnalysesService,
    AnalysisRepository,
    AnalysisImageRepository,
    ImageGeoService,
    ImageInferenceService,
    ImageInferenceProcessor,
  ],
})
export class AnalysesModule {}
