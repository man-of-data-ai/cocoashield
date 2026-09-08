import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { hashPassword as betterAuthHashPassword, verifyPassword as betterAuthVerifyPassword } from 'better-auth/crypto';
import { Organization, ServiceOffer } from '../organizations/entities/organization.entity';
import { UpdateOwnAccountDto, UpdateUserProfileDto } from './dtos/update-user-profile.dto';
import { AdminOrganization } from './entities/admin-organization.entity';
import { UserProfile, UserRole, UserStatus } from './entities/user-profile.entity';

const AUTONOMOUS_ADMIN_OFFERS = new Set<ServiceOffer>([ServiceOffer.SAAS_BYOD, ServiceOffer.ON_PREMISE]);

export type UserAccessScope = {
  userId: string;
  role: UserRole;
  isPlatformAdmin: boolean;
  organizationIds: string[];
  primaryOrganizationId: string | null;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserProfile) private readonly profiles: Repository<UserProfile>,
    @InjectRepository(AdminOrganization) private readonly assignments: Repository<AdminOrganization>,
    @InjectRepository(Organization) private readonly organizations: Repository<Organization>,
    private readonly dataSource: DataSource,
  ) {}

  async ensureProfile(userId: string): Promise<UserProfile> {
    let profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) profile = await this.profiles.save(this.profiles.create({ userId, role: UserRole.AGRONOME_TERRAIN, cooperative: 'Cocoashield', status: UserStatus.ACTIVE, isPlatformAdmin: false }));
    return profile;
  }

  private async promoteLegacyPlatformAdmin(profile: UserProfile): Promise<UserProfile> {
    if (profile.isPlatformAdmin || profile.role !== UserRole.ADMINISTRATEUR || profile.cooperative !== 'Cocoashield') return profile;
    const rows = await this.dataSource.query(`SELECT email FROM "user" WHERE id = $1 LIMIT 1`, [profile.userId]);
    if (rows[0]?.email === 'admin@cocoashield.local') {
      profile.isPlatformAdmin = true;
      return this.profiles.save(profile);
    }
    return profile;
  }

  private async managedOrganizationIds(profile: UserProfile): Promise<string[]> {
    if (profile.isPlatformAdmin) return (await this.organizations.find({ select: { id: true } })).map((org) => org.id);
    if (profile.role !== UserRole.ADMINISTRATEUR) return profile.organizationId ? [profile.organizationId] : [];
    const links = await this.assignments.find({ where: { userId: profile.userId } });
    const ids = links.map((link) => link.organizationId);
    if (!ids.length && profile.organizationId) ids.push(profile.organizationId);
    return [...new Set(ids)];
  }

  async getAccessScope(userId: string): Promise<UserAccessScope> {
    const profile = await this.promoteLegacyPlatformAdmin(await this.ensureProfile(userId));
    if (profile.status !== UserStatus.ACTIVE) throw new ForbiddenException('Inactive account');
    return {
      userId,
      role: profile.role,
      isPlatformAdmin: profile.isPlatformAdmin,
      organizationIds: await this.managedOrganizationIds(profile),
      primaryOrganizationId: profile.organizationId,
    };
  }

  async current(userId: string) {
    const profile = await this.promoteLegacyPlatformAdmin(await this.ensureProfile(userId));
    const rows = await this.dataSource.query(`SELECT id, name, email, username FROM "user" WHERE id = $1 LIMIT 1`, [userId]);
    const organization = profile.organizationId ? await this.organizations.findOne({ where: { id: profile.organizationId } }) : null;
    return {
      ...rows[0],
      role: profile.role,
      cooperative: profile.cooperative,
      organizationId: profile.organizationId,
      organizationOffer: organization?.offer ?? null,
      status: profile.status,
      isPlatformAdmin: profile.isPlatformAdmin,
      managedOrganizationIds: await this.managedOrganizationIds(profile),
    };
  }

  private async requireAdmin(userId: string): Promise<UserProfile> {
    const profile = await this.promoteLegacyPlatformAdmin(await this.ensureProfile(userId));
    if (profile.role !== UserRole.ADMINISTRATEUR || profile.status !== UserStatus.ACTIVE) throw new ForbiddenException('Administrator access required');
    return profile;
  }

  private async listUsers() {
    const users: Array<{ id: string; name: string; email: string; username?: string | null; createdAt?: Date }> = await this.dataSource.query(`SELECT id, name, email, username, "createdAt" FROM "user" ORDER BY "createdAt" DESC`);
    const profiles = await this.profiles.find();
    const map = new Map(profiles.map((profile) => [profile.userId, profile]));
    return Promise.all(users.map(async (user) => {
      const profile = await this.promoteLegacyPlatformAdmin(map.get(user.id) ?? await this.ensureProfile(user.id));
      return { ...user, role: profile.role, cooperative: profile.cooperative, organizationId: profile.organizationId, status: profile.status, isPlatformAdmin: profile.isPlatformAdmin, managedOrganizationIds: await this.managedOrganizationIds(profile) };
    }));
  }

  async listForAdmin(actorId: string) {
    const actor = await this.requireAdmin(actorId);
    const users = await this.listUsers();
    if (actor.isPlatformAdmin) return users;
    const allowed = new Set(await this.managedOrganizationIds(actor));
    return users.filter((user) => !user.isPlatformAdmin && (Boolean(user.organizationId && allowed.has(user.organizationId)) || user.managedOrganizationIds.some((id) => allowed.has(id))));
  }

  async visibleUserIdsForActor(actorId: string): Promise<string[]> {
    const actor = await this.ensureProfile(actorId);
    if (actor.role === UserRole.ADMINISTRATEUR) return (await this.listForAdmin(actorId)).map((user) => user.id);
    const scope = await this.getAccessScope(actorId);
    const users = await this.listUsers();
    const allowed = new Set(scope.organizationIds);
    return users.filter((user) => !user.isPlatformAdmin && (user.id === actorId || Boolean(user.organizationId && allowed.has(user.organizationId)))).map((user) => user.id);
  }

  private async assertOrganizationsAllowed(actor: UserProfile, organizationIds: string[]) {
    if (actor.isPlatformAdmin) return;
    const allowed = new Set(await this.managedOrganizationIds(actor));
    if (organizationIds.some((id) => !allowed.has(id))) throw new ForbiddenException('You cannot manage users outside your organizations');
  }

  private async assertAutonomousAdminAllowed(organizationIds: string[]) {
    if (!organizationIds.length) throw new BadRequestException('An organization administrator must be attached to at least one organization');
    const orgs = await this.organizations.find({ where: { id: In(organizationIds) } });
    if (orgs.length !== organizationIds.length) throw new BadRequestException('Unknown organization');
    const blocked = orgs.find((org) => !AUTONOMOUS_ADMIN_OFFERS.has(org.offer));
    if (blocked) throw new BadRequestException(`The ${blocked.offer} offer does not allow autonomous client administration`);
  }

  private async assertAdminContinuity(targetUserId: string, nextRole?: UserRole) {
    const target = await this.ensureProfile(targetUserId);
    if (target.role !== UserRole.ADMINISTRATEUR || nextRole === UserRole.ADMINISTRATEUR) return;
    const adminCount = await this.profiles.count({ where: { role: UserRole.ADMINISTRATEUR, status: UserStatus.ACTIVE } });
    if (adminCount <= 1) throw new BadRequestException('At least one active administrator must remain');
  }

  private async saveManagedOrganizations(userId: string, ids: string[]) {
    await this.assignments.delete({ userId });
    if (ids.length) await this.assignments.save(ids.map((organizationId) => this.assignments.create({ userId, organizationId })));
  }

  private async updateIdentity(userId: string, input: { name?: string; email?: string }) {
    if (input.name === undefined && input.email === undefined) return;
    const fields: string[] = [];
    const values: unknown[] = [];
    if (input.name !== undefined) { fields.push(`name = $${values.length + 1}`); values.push(input.name.trim()); }
    if (input.email !== undefined) { fields.push(`email = $${values.length + 1}`); values.push(input.email.trim().toLowerCase()); }
    fields.push(`"updatedAt" = NOW()`);
    values.push(userId);
    try {
      await this.dataSource.query(`UPDATE "user" SET ${fields.join(', ')} WHERE id = $${values.length}`, values);
    } catch (error) {
      throw new BadRequestException('Le nom ou l’adresse email ne peut pas être utilisé.');
    }
  }

  private async setPassword(userId: string, password: string, revokeSessions = true) {
    const hashed = await betterAuthHashPassword(password);
    const result = await this.dataSource.query(`UPDATE "account" SET password = $1, "updatedAt" = NOW() WHERE "userId" = $2 AND "providerId" = 'credential' RETURNING id`, [hashed, userId]);
    if (!result[0]) throw new BadRequestException('Aucun compte avec mot de passe n’est associé à cet utilisateur.');
    if (revokeSessions) await this.dataSource.query(`DELETE FROM "session" WHERE "userId" = $1`, [userId]).catch(() => undefined);
  }

  private async verifyPassword(userId: string, password: string): Promise<boolean> {
    const rows = await this.dataSource.query(`SELECT password FROM "account" WHERE "userId" = $1 AND "providerId" = 'credential' LIMIT 1`, [userId]);
    if (!rows[0]?.password) return false;
    return betterAuthVerifyPassword({ password, hash: rows[0].password });
  }

  async update(userId: string, dto: UpdateUserProfileDto) {
    const exists = await this.dataSource.query(`SELECT id, name, email, username, "createdAt" FROM "user" WHERE id = $1 LIMIT 1`, [userId]);
    if (!exists[0]) throw new NotFoundException('User not found');
    const profile = await this.ensureProfile(userId);
    const { managedOrganizationIds, name, email, password, ...profilePatch } = dto;
    Object.assign(profile, profilePatch);
    await this.profiles.save(profile);
    if (managedOrganizationIds) await this.saveManagedOrganizations(userId, managedOrganizationIds);
    await this.updateIdentity(userId, { name, email });
    if (password) await this.setPassword(userId, password);
    const fresh = await this.dataSource.query(`SELECT id, name, email, username, "createdAt" FROM "user" WHERE id = $1 LIMIT 1`, [userId]);
    return { ...fresh[0], role: profile.role, cooperative: profile.cooperative, organizationId: profile.organizationId, status: profile.status, isPlatformAdmin: profile.isPlatformAdmin, managedOrganizationIds: await this.managedOrganizationIds(profile) };
  }

  async updateForAdmin(actorId: string, userId: string, dto: UpdateUserProfileDto) {
    const actor = await this.requireAdmin(actorId);
    const target = await this.ensureProfile(userId);
    if (!actor.isPlatformAdmin && target.isPlatformAdmin) throw new ForbiddenException('The CocoaShield administrator cannot be managed by a client administrator');
    if (!actor.isPlatformAdmin && dto.isPlatformAdmin) throw new ForbiddenException('Only a CocoaShield administrator can grant platform administrator access');
    if (actorId === userId && dto.role && dto.role !== UserRole.ADMINISTRATEUR) throw new BadRequestException('You cannot remove your own administrator role');
    if (actorId === userId && dto.status === UserStatus.INACTIVE) throw new BadRequestException('Vous ne pouvez pas désactiver votre propre compte.');
    if (dto.role) await this.assertAdminContinuity(userId, dto.role);

    const nextRole = dto.role ?? target.role;
    const nextManaged = dto.managedOrganizationIds ?? await this.managedOrganizationIds(target);
    const scopedIds = nextRole === UserRole.ADMINISTRATEUR ? nextManaged : (dto.organizationId ? [dto.organizationId] : target.organizationId ? [target.organizationId] : []);
    await this.assertOrganizationsAllowed(actor, scopedIds);
    if (nextRole === UserRole.ADMINISTRATEUR && !(dto.isPlatformAdmin ?? target.isPlatformAdmin)) await this.assertAutonomousAdminAllowed(nextManaged);
    if (nextRole !== UserRole.ADMINISTRATEUR && dto.organizationId) {
      const org = await this.organizations.findOne({ where: { id: dto.organizationId } });
      if (!org) throw new BadRequestException('Unknown organization');
      dto.cooperative = org.name;
    }
    return this.update(userId, dto);
  }

  async updateOwnAccount(userId: string, dto: UpdateOwnAccountDto) {
    if (dto.password) {
      if (!dto.currentPassword) throw new BadRequestException('Le mot de passe actuel est requis.');
      if (!await this.verifyPassword(userId, dto.currentPassword)) throw new BadRequestException('Le mot de passe actuel est incorrect.');
    }
    await this.updateIdentity(userId, { name: dto.name });
    if (dto.password) await this.setPassword(userId, dto.password, false);
    return this.current(userId);
  }

  async deleteForAdmin(actorId: string, userId: string) {
    const actor = await this.requireAdmin(actorId);
    if (actorId === userId) throw new BadRequestException('You cannot delete your own account');
    const target = await this.ensureProfile(userId);
    if (!actor.isPlatformAdmin && target.isPlatformAdmin) throw new ForbiddenException('The CocoaShield administrator cannot be managed by a client administrator');
    await this.assertOrganizationsAllowed(actor, target.role === UserRole.ADMINISTRATEUR ? await this.managedOrganizationIds(target) : target.organizationId ? [target.organizationId] : []);
    const exists = await this.dataSource.query(`SELECT id FROM "user" WHERE id = $1 LIMIT 1`, [userId]);
    if (!exists[0]) throw new NotFoundException('User not found');
    await this.assertAdminContinuity(userId, undefined);
    await this.dataSource.transaction(async (manager) => {
      await manager.query(`DELETE FROM admin_organization WHERE user_id = $1`, [userId]).catch(() => undefined);
      await manager.query(`DELETE FROM app_user_profile WHERE user_id = $1`, [userId]);
      await manager.query(`DELETE FROM "session" WHERE "userId" = $1`, [userId]).catch(() => undefined);
      await manager.query(`DELETE FROM "account" WHERE "userId" = $1`, [userId]).catch(() => undefined);
      await manager.query(`DELETE FROM "user" WHERE id = $1`, [userId]);
    });
    return { id: userId, deleted: true };
  }
}
