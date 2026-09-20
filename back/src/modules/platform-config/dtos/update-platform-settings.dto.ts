import { IsInt, IsNumber, Max, Min } from 'class-validator';

export class UpdatePlatformSettingsDto {
  @IsNumber() @Min(0) @Max(1) severityLow: number;
  @IsNumber() @Min(0) @Max(1) severityModerate: number;
  @IsNumber() @Min(0) @Max(1) severityHigh: number;
  @IsNumber() @Min(0) @Max(1) severityCritical: number;
  @IsNumber() @Min(0) @Max(1) minimumConfidence: number;
  @IsNumber() @Min(1) @Max(500) clusteringRadiusM: number;
  @IsInt() @Min(1) @Max(10000) minImagesPerZone: number;
  @IsNumber() @Min(0.1) @Max(100) dedupDistanceM: number;
  @IsInt() @Min(1) @Max(3600) dedupWindowS: number;
  @IsInt() @Min(1) @Max(3600) refreshIntervalConnectedS: number;
  @IsInt() @Min(1) @Max(120) batchRecalcMaxDelayMin: number;
  @IsInt() @Min(1) @Max(1440) syncRetryIntervalMin: number;
  @IsInt() @Min(50) @Max(10000) offlineTileCacheSizeMb: number;
  @IsInt() @Min(1) @Max(240) historyRetentionMonths: number;
  @IsInt() @Min(5) @Max(1440) sessionDurationMinutes: number;
}
