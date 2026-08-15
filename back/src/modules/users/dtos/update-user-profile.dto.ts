import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole, UserStatus } from '../entities/user-profile.entity';

export class UpdateUserProfileDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  cooperative?: string | null;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
