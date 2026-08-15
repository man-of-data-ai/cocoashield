import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateMissionDto {
  @IsString()
  @MinLength(1)
  name: string;

  /** ISO date string; falls back to "now" if omitted. */
  @IsOptional()
  @IsString()
  missionDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
