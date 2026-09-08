import { IsArray, IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole, UserStatus } from '../entities/user-profile.entity';

export class UpdateUserProfileDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MinLength(8) password?: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() @IsString() cooperative?: string | null;
  @IsOptional() @IsString() organizationId?: string | null;
  @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
  @IsOptional() @IsBoolean() isPlatformAdmin?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) managedOrganizationIds?: string[];
}

export class UpdateOwnAccountDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() @MinLength(8) password?: string;
  @IsOptional() @IsString() currentPassword?: string;
}
