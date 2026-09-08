import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminOrganization } from '../users/entities/admin-organization.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { Organization } from './entities/organization.entity';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
@Module({imports:[TypeOrmModule.forFeature([Organization, UserProfile, AdminOrganization])],controllers:[OrganizationsController],providers:[OrganizationsService],exports:[OrganizationsService]}) export class OrganizationsModule {}
