import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateMissionDto } from './dtos/create-mission.dto';
import { Mission } from './entities/mission.entity';
import { MissionRepository } from './repositories/mission.repository';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user-profile.entity';

@Injectable()
export class MissionsService {
  constructor(
    private readonly missionRepository: MissionRepository,
    private readonly usersService: UsersService,
  ) {}

  async create(ownerId: string, dto: CreateMissionDto): Promise<Mission> {
    const scope = await this.usersService.getAccessScope(ownerId);
    if (scope.role !== UserRole.ADMINISTRATEUR || scope.isPlatformAdmin) {
      throw new ForbiddenException('Seul un administrateur client peut créer une mission.');
    }
    const organizationId = scope.isPlatformAdmin ? scope.primaryOrganizationId : scope.organizationIds[0] ?? scope.primaryOrganizationId;
    if (!scope.isPlatformAdmin && !organizationId) throw new BadRequestException('Votre compte doit être rattaché à une organisation pour créer une mission.');
    return this.missionRepository.create({
      ownerId,
      organizationId: organizationId ?? null,
      name: dto.name,
      missionDate: new Date(dto.missionDate),
      droneProfileId: dto.droneProfileId,
      parcelIds: dto.parcelIds,
      notes: dto.notes?.trim() || null,
    });
  }

  async updateNotes(id: string, actorId: string, notes: string): Promise<Mission> {
    const scope = await this.usersService.getAccessScope(actorId);
    if (![UserRole.ADMINISTRATEUR, UserRole.AGRONOME_TERRAIN].includes(scope.role) || scope.isPlatformAdmin) {
      throw new ForbiddenException('Seul un administrateur client ou un agronome peut ajouter une note à une mission.');
    }
    const mission = await this.missionRepository.findByIdAccessible(id, actorId, scope.organizationIds, scope.isPlatformAdmin);
    if (!mission) throw new NotFoundException('Mission not found');
    await this.missionRepository.updateNotes(id, notes.trim() || null);
    const updated = await this.missionRepository.findByIdAccessible(id, actorId, scope.organizationIds, scope.isPlatformAdmin);
    if (!updated) throw new NotFoundException('Mission not found');
    return updated;
  }

  async findAllForOwner(ownerId: string): Promise<Mission[]> {
    const scope = await this.usersService.getAccessScope(ownerId);
    if (scope.role === UserRole.DIRECTION_CCC) throw new NotFoundException('Mission data is not available for this role');
    return this.missionRepository.findAccessible(ownerId, scope.organizationIds, scope.isPlatformAdmin);
  }

  async findOneForOwner(id: string, ownerId: string): Promise<Mission> {
    const scope = await this.usersService.getAccessScope(ownerId);
    if (scope.role === UserRole.DIRECTION_CCC) throw new NotFoundException('Mission not found');
    const mission = await this.missionRepository.findByIdAccessible(id, ownerId, scope.organizationIds, scope.isPlatformAdmin);
    if (!mission) throw new NotFoundException('Mission not found');
    return mission;
  }

  async resolve(ownerId: string, missionId?: string | null): Promise<Mission | null> {
    if (!missionId) return null;
    return this.findOneForOwner(missionId, ownerId);
  }
}
