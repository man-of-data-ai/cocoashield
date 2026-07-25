import { ArrayMinSize, IsArray, IsString, MinLength } from 'class-validator';

export class CreateParcelDto {
  @IsString()
  @MinLength(2)
  name: string;

  /**
   * Coordinates delimiting the field boundary, as a single ring of
   * [longitude, latitude] pairs (GeoJSON order). The ring is closed
   * automatically if the first and last points differ.
   */
  @IsArray()
  @ArrayMinSize(3)
  coordinates: [number, number][];
}
