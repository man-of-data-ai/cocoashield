import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { DroneProfile } from './entities/drone-profile.entity';
import { PlatformSettings } from './entities/platform-settings.entity';
import { PlatformConfigController } from './platform-config.controller';
import { PlatformConfigService } from './platform-config.service';

@Module({
  imports: [
    AuditModule,
    TypeOrmModule.forFeature([PlatformSettings, DroneProfile]),
  ],
  controllers: [PlatformConfigController],
  providers: [PlatformConfigService],
  exports: [PlatformConfigService],
})
export class PlatformConfigModule {}
