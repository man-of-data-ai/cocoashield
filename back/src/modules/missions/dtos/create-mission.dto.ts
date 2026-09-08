import { ArrayMinSize, IsArray, IsISO8601, IsOptional, IsString, MinLength } from 'class-validator';
export class CreateMissionDto {
 @IsString() @MinLength(1) name: string;
 @IsISO8601() missionDate: string;
 @IsString() @MinLength(1) droneProfileId: string;
 @IsArray() @ArrayMinSize(1) @IsString({each:true}) parcelIds: string[];
 @IsOptional() @IsString() notes?: string;
}
