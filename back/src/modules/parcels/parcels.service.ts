import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Parcel, ParcelStatus, TerrainVerificationStatus } from './entities/parcel.entity';
import { CreateParcelDto } from './dtos/create-parcel.dto';
import { ParcelRepository } from './repositories/parcel.repository';
import { AuditActor, AuditService } from '../audit/audit.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user-profile.entity';

@Injectable()
export class ParcelsService {
  constructor(
    private readonly parcelRepository: ParcelRepository,
    private readonly auditService: AuditService,
    private readonly usersService: UsersService,
  ) {}

  async create(ownerId: string, dto: CreateParcelDto, actor?: AuditActor): Promise<Parcel> {
    const ring = this.closeRing(dto.coordinates);
    const scope = await this.usersService.getAccessScope(ownerId);
    const organizationId = scope.isPlatformAdmin
      ? scope.primaryOrganizationId
      : scope.organizationIds[0] ?? scope.primaryOrganizationId;

    if (!scope.isPlatformAdmin && !organizationId) {
      throw new BadRequestException('Votre compte doit être rattaché à une organisation pour créer une parcelle.');
    }

    const parcel = await this.parcelRepository.create({
      ownerId,
      organizationId: organizationId ?? null,
      name: dto.name,
      producerName: dto.producerName?.trim() || null,
      producerEmail: dto.producerEmail?.trim() || null,
      producerPhone: dto.producerPhone?.trim() || null,
      boundary: { type: 'Polygon', coordinates: [ring] },
      status: ParcelStatus.NOT_ANALYZED,
    });
    if (actor) {
      await this.auditService.log({ ...actor, action: 'parcel.created', targetType: 'parcel', targetId: parcel.id, targetLabel: parcel.name, details: { coordinateCount: ring.length, organizationId: parcel.organizationId } });
    }
    return parcel;
  }

  async findAllForOwner(ownerId: string): Promise<Parcel[]> {
    const scope = await this.usersService.getAccessScope(ownerId);
    if (scope.role === UserRole.DIRECTION_CCC && !scope.isPlatformAdmin) {
      throw new ForbiddenException('La Direction dispose uniquement de la vue agrégée et ne peut pas consulter les parcelles nominatives.');
    }
    return this.parcelRepository.findAccessible(ownerId, scope.organizationIds, scope.isPlatformAdmin);
  }

  async summaryForOwner(ownerId: string) {
    const scope = await this.usersService.getAccessScope(ownerId);
    const parcels = await this.parcelRepository.findAccessible(ownerId, scope.organizationIds, scope.isPlatformAdmin);
    const analyses = parcels.flatMap((parcel) => parcel.analyses ?? []);
    const completed = analyses.filter((analysis) => String(analysis.status) === 'completed');
    const infected = completed.filter((analysis) => String(analysis.result) === 'infected');
    const latestByParcel = parcels.map((parcel) => parcel.analyses?.[0]).filter(Boolean);
    const zones = latestByParcel.flatMap((analysis: any) => analysis?.affectedZones ?? []);
    const affectedSurfaceSquareMeters = zones.reduce((sum: number, zone: any) => sum + Number(zone.surfaceSquareMeters ?? 0), 0);
    const criticalZones = zones.filter((zone: any) => zone.severityLevel === 'critique').length;
    const activeZones = zones.filter((zone: any) => (zone.zoneStatus ?? 'active') !== 'regression').length;
    const averageInfectionPercentage = completed.length ? completed.reduce((sum, analysis) => sum + Number(analysis.infectionPercentage ?? 0), 0) / completed.length : 0;
    return {
      parcelCount: parcels.length,
      analyzedParcelCount: parcels.filter((parcel) => (parcel.analyses?.length ?? 0) > 0).length,
      analysisCount: analyses.length,
      completedAnalysisCount: completed.length,
      infectedAnalysisCount: infected.length,
      averageInfectionPercentage,
      activeZones,
      criticalZones,
      affectedSurfaceSquareMeters,
      generatedAt: new Date().toISOString(),
    };
  }

  async findOneForOwner(id: string, ownerId: string, actor?: AuditActor): Promise<Parcel> {
    const scope = await this.usersService.getAccessScope(ownerId);
    if (scope.role === UserRole.DIRECTION_CCC && !scope.isPlatformAdmin) throw new ForbiddenException('La Direction ne peut pas consulter une parcelle nominative.');
    const parcel = await this.parcelRepository.findByIdAccessible(id, ownerId, scope.organizationIds, scope.isPlatformAdmin);
    if (!parcel) throw new NotFoundException('Parcel not found');
    if (actor) {
      await this.auditService.log({ ...actor, action: 'parcel.consulted', targetType: 'parcel', targetId: parcel.id, targetLabel: parcel.name, details: { status: parcel.status, organizationId: parcel.organizationId } });
    }
    return parcel;
  }

  async resolveForCapture(
    userId: string,
    position: { latitude: number; longitude: number } | null,
  ): Promise<string> {
    const scope = await this.usersService.getAccessScope(userId);

    if (position) {
      const containing = await this.parcelRepository.findContaining(
        position.latitude,
        position.longitude,
        userId,
        scope.organizationIds,
        scope.isPlatformAdmin,
      );
      if (containing) return containing.id;
    }

    const { defaultParcelId } = await this.usersService.ensureProfile(userId);
    if (!defaultParcelId) {
      throw new BadRequestException(
        "Aucune parcelle ne contient cette position et aucune parcelle par défaut n'est rattachée à ce compte.",
      );
    }

    const fallback = await this.parcelRepository.findByIdAccessible(
      defaultParcelId,
      userId,
      scope.organizationIds,
      scope.isPlatformAdmin,
    );
    if (!fallback) {
      throw new BadRequestException(
        "La parcelle par défaut de ce compte est introuvable ou hors de son périmètre.",
      );
    }
    return fallback.id;
  }

  updateStatus(id: string, status: ParcelStatus): Promise<void> {
    return this.parcelRepository.updateStatus(id, status);
  }

  async updateVerification(id: string, ownerId: string, status: TerrainVerificationStatus, comment?: string, actor?: AuditActor): Promise<Parcel> {
    const scope = await this.usersService.getAccessScope(ownerId);
    if (![UserRole.ADMINISTRATEUR, UserRole.AGRONOME_TERRAIN].includes(scope.role)) {
      throw new BadRequestException('Seul un agronome ou un administrateur peut valider un diagnostic terrain.');
    }
    await this.findOneForOwner(id, ownerId);
    await this.parcelRepository.updateVerification(id, {
      terrainVerificationStatus: status,
      terrainVerificationComment: comment?.trim() || null,
      terrainVerifiedAt: status === TerrainVerificationStatus.PENDING ? null : new Date(),
    });
    const parcel = await this.findOneForOwner(id, ownerId);
    if (actor) {
      await this.auditService.log({
        ...actor,
        action: status === TerrainVerificationStatus.VERIFIED ? 'parcel.verified' : status === TerrainVerificationStatus.FALSE_POSITIVE ? 'parcel.false_positive' : 'parcel.verification.reset',
        targetType: 'parcel',
        targetId: parcel.id,
        targetLabel: parcel.name,
        details: { verificationStatus: status, comment: comment?.trim() || null, organizationId: parcel.organizationId },
      });
    }
    return parcel;
  }

  private closeRing(points: [number, number][]): number[][] {
    const [first] = points;
    const last = points[points.length - 1];
    const isClosed = first[0] === last[0] && first[1] === last[1];
    return isClosed ? points : [...points, first];
  }
}
