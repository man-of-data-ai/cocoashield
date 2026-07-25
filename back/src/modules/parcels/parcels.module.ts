import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parcel } from './entities/parcel.entity';
import { ParcelsController } from './parcels.controller';
import { ParcelsService } from './parcels.service';
import { ParcelRepository } from './repositories/parcel.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Parcel])],
  controllers: [ParcelsController],
  providers: [ParcelsService, ParcelRepository],
  exports: [ParcelsService],
})
export class ParcelsModule {}
