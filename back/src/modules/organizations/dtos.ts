import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { OrganizationType, ServiceOffer } from './entities/organization.entity';

export class CreateOrganizationDto {
  @IsString() @MinLength(2) name: string;
  @IsEnum(OrganizationType) type: OrganizationType;
  @IsEnum(ServiceOffer) offer: ServiceOffer;
  @IsOptional() @IsEmail() email?: string | null;
  @IsOptional() @IsString() phone?: string | null;
  @IsOptional() @IsBoolean() active?: boolean;
}
export class UpdateOrganizationDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsEnum(OrganizationType) type?: OrganizationType;
  @IsOptional() @IsEnum(ServiceOffer) offer?: ServiceOffer;
  @IsOptional() @IsEmail() email?: string | null;
  @IsOptional() @IsString() phone?: string | null;
  @IsOptional() @IsBoolean() active?: boolean;
}
