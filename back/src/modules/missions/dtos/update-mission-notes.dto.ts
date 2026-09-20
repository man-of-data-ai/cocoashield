import { IsString, MaxLength } from 'class-validator';

export class UpdateMissionNotesDto {
  @IsString()
  @MaxLength(5000)
  notes: string;
}
