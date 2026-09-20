import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

const VECTOR_TYPES = ['drone_aile_tournante', 'drone_aile_fixe', 'robot_sol', 'mobile'] as const;

export class CreateDroneProfileDto {
  @IsString() @MinLength(1) profileId: string;
  @IsString() @MinLength(1) manufacturer: string;
  @IsString() @MinLength(1) model: string;

  @IsOptional() @IsIn(VECTOR_TYPES) vectorType?: string;
  @IsOptional() @IsBoolean() supportsRtk?: boolean;
  @IsOptional() @IsNumber() @Min(0) @Max(10000) rtkPrecisionCm?: number | null;
  @IsOptional() @IsNumber() @Min(0) @Max(10000) rtkFloatPrecisionCm?: number | null;
  @IsOptional() @IsNumber() @Min(0) @Max(10000) noCorrectionPrecisionM?: number;

  @IsString() @MinLength(1) metadataFormat: string;
  @IsOptional() @IsString() latitudeField?: string;
  @IsOptional() @IsString() longitudeField?: string;
  @IsOptional() @IsString() absoluteAltitudeField?: string | null;
  @IsOptional() @IsString() relativeAltitudeField?: string | null;
  @IsOptional() @IsString() orientationFields?: string;
  @IsOptional() @IsString() timestampField?: string;
  @IsOptional() @IsString() rtkStatusField?: string | null;
  @IsOptional() @IsString() rtkStatusMapping?: string | null;
  @IsOptional() @IsString() nativeMissionExport?: string | null;
  @IsOptional() @IsBoolean() active?: boolean;
}
