import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '../organizations/entities/organization.entity';
import { UsersModule } from '../users/users.module';
import { DroneProfile } from './entities/drone-profile.entity';
import { PlatformSettings } from './entities/platform-settings.entity';
import { PlatformConfigController } from './platform-config.controller';
import { PlatformConfigService } from './platform-config.service';

@Module({
  imports: [AuditModule, UsersModule, TypeOrmModule.forFeature([PlatformSettings, DroneProfile, Organization])],
  controllers: [PlatformConfigController],
  providers: [PlatformConfigService],
  exports: [PlatformConfigService],
})
export class PlatformConfigModule {}
