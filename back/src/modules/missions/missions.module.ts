import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { Mission } from './entities/mission.entity';
import { MissionsController } from './missions.controller';
import { MissionsService } from './missions.service';
import { MissionRepository } from './repositories/mission.repository';

@Module({
  imports: [UsersModule, TypeOrmModule.forFeature([Mission])],
  controllers: [MissionsController],
  providers: [MissionsService, MissionRepository],
  exports: [MissionsService],
})
export class MissionsModule {}
