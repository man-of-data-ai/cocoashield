import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { Parcel } from './entities/parcel.entity';
import { ParcelsController } from './parcels.controller';
import { ParcelsService } from './parcels.service';
import { ParcelRepository } from './repositories/parcel.repository';

@Module({
  imports: [AuditModule, UsersModule, TypeOrmModule.forFeature([Parcel])],
  controllers: [ParcelsController],
  providers: [ParcelsService, ParcelRepository],
  exports: [ParcelsService],
})
export class ParcelsModule {}
