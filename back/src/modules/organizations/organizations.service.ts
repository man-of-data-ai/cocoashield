import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AdminOrganization } from '../users/entities/admin-organization.entity';
import { UserProfile, UserRole, UserStatus } from '../users/entities/user-profile.entity';
import { ConfigService } from '../../libs/infrastructure/config/config.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dtos';
import { Organization } from './entities/organization.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization) private readonly repo: Repository<Organization>,
    @InjectRepository(UserProfile) private readonly profiles: Repository<UserProfile>,
    @InjectRepository(AdminOrganization) private readonly assignments: Repository<AdminOrganization>,
    private readonly config: ConfigService,
  ) {}

  private async actor(userId: string) {
    const profile = await this.profiles.findOne({ where: { userId } });
    if (!profile || profile.role !== UserRole.ADMINISTRATEUR || profile.status !== UserStatus.ACTIVE) throw new ForbiddenException('Administrator access required');
    return profile;
  }

  async listForActor(userId: string, includeInactive = false) {
    await this.ensureDemo();
    const actor = await this.actor(userId);
    if (actor.isPlatformAdmin) return this.repo.find({ where: includeInactive ? {} : { active: true }, order: { name: 'ASC' } });
    const links = await this.assignments.find({ where: { userId } });
    const ids = links.map((link) => link.organizationId);
    if (ids.length === 0 && actor.organizationId) ids.push(actor.organizationId);
    if (!ids.length) return [];
    const where: any = { id: In(ids) };
    if (!includeInactive) where.active = true;
    return this.repo.find({ where, order: { name: 'ASC' } });
  }

  async createForPlatformAdmin(userId: string, dto: CreateOrganizationDto) {
    const actor = await this.actor(userId);
    if (!actor.isPlatformAdmin) throw new ForbiddenException('CocoaShield platform administrator access required');
    return this.repo.save(this.repo.create({ ...dto, email: dto.email ?? null, phone: dto.phone ?? null, active: dto.active ?? true }));
  }

  async updateForPlatformAdmin(userId: string, id: string, dto: UpdateOrganizationDto) {
    const actor = await this.actor(userId);
    if (!actor.isPlatformAdmin) throw new ForbiddenException('CocoaShield platform administrator access required');
    const org = await this.repo.findOne({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');
    Object.assign(org, dto);
    return this.repo.save(org);
  }

  /**
   * Jeu d'organisations de démonstration, pour que les écrans ne soient pas
   * vides pendant une présentation. Jamais en production : ces quatre entités
   * sont fictives, et une fois écrites elles sont indiscernables de vraies
   * organisations clientes. Un administrateur plateforme crée les siennes via
   * POST /v1/organizations.
   */
  private async ensureDemo() {
    if (this.config.isProduction) return;
    if (await this.repo.count()) return;
    await this.repo.save(this.repo.create([
      {name:'COOP-CA Soubré',type:'cooperative',offer:'saas_byod',email:'contact@coop-soubre.ci',phone:'+225 07 00 00 00 01'},
      {name:'Conseil du Café-Cacao',type:'direction',offer:'on_premise',email:'direction@ccc.ci',phone:'+225 27 20 00 00 00'},
      {name:'Entreprise Demo Cacao',type:'company',offer:'saas_annuel',email:'cacao@demo.ci',phone:'+225 05 00 00 00 02'},
      {name:'Coopérative Mission Ponctuelle',type:'cooperative',offer:'saas_ponctuel',email:'mission@coop.ci',phone:'+225 01 00 00 00 03'}
    ] as any));
  }
}
