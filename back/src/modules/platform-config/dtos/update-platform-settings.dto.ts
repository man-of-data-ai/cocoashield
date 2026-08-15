import { IsInt, IsNumber, Max, Min } from 'class-validator';

export class UpdatePlatformSettingsDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  severityModerate: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  severityHigh: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  severityCritical: number;

  @IsNumber()
  @Min(1)
  @Max(500)
  clusteringRadiusM: number;

  @IsInt()
  @Min(1)
  @Max(10000)
  minImagesPerZone: number;
}
