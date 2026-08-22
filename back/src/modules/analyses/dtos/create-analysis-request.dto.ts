import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/**
 * Champs texte accompagnant les images d'une analyse (requête multipart).
 *
 * `results` reste une chaîne JSON : le format multipart ne transporte pas de
 * structures imbriquées. Elle est validée dans le contrôleur.
 */
export class CreateAnalysisRequestDto {
  @IsOptional()
  @IsString()
  results?: string;

  @IsOptional()
  @IsUUID()
  missionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  missionName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  profileId?: string;
}
