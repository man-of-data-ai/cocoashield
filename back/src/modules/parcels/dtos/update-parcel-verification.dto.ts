import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TerrainVerificationStatus } from '../entities/parcel.entity';

export class UpdateParcelVerificationDto {
  @IsEnum(TerrainVerificationStatus)
  status: TerrainVerificationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  comment?: string;
}
