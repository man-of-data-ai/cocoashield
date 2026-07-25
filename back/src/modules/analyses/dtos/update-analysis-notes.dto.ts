import { IsString } from 'class-validator';

export class UpdateAnalysisNotesDto {
  @IsString()
  notes: string;
}
