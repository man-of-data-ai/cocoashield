import {
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateMissionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  /** Date ISO ; par défaut, la date du jour. */
  @IsOptional()
  @IsISO8601()
  missionDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}
