import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateDroneProfileDto {
  @IsString()
  @MinLength(1)
  profileId: string;

  @IsString()
  @MinLength(1)
  manufacturer: string;

  @IsString()
  @MinLength(1)
  model: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  rtkPrecisionCm?: number | null;

  @IsString()
  @MinLength(1)
  metadataFormat: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
