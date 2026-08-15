import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class UpdateDroneProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  profileId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  manufacturer?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  model?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  rtkPrecisionCm?: number | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  metadataFormat?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
