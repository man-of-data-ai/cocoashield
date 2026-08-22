import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ExportFormat, ExportScope } from '../entities/export-record.entity';

export class CreateExportDto {
  @IsEnum(ExportScope)
  scope: ExportScope;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(ExportFormat, { each: true })
  formats: ExportFormat[];

  @IsOptional()
  @IsUUID()
  scopeId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsBoolean()
  includeSourceImages: boolean;

  @IsBoolean()
  verifiedOnly: boolean;
}
