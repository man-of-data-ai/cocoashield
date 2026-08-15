import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserProfile, UserRole, UserStatus } from './entities/user-profile.entity';
import { UpdateUserProfileDto } from './dtos/update-user-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserProfile) private readonly profiles: Repository<UserProfile>,
    private readonly dataSource: DataSource,
  ) {}

  async ensureProfile(userId: string): Promise<UserProfile> {
    let profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) {
      profile = await this.profiles.save(this.profiles.create({ userId, role: UserRole.AGRONOME_TERRAIN, cooperative: 'Cocoashield', status: UserStatus.ACTIVE }));
    }
    return profile;
  }

  async current(userId: string) {
    const profile = await this.ensureProfile(userId);
    return { role: profile.role, cooperative: profile.cooperative, status: profile.status };
  }

  private async requireAdmin(userId: string): Promise<UserProfile> {
    const profile = await this.ensureProfile(userId);
    if (profile.role !== UserRole.ADMINISTRATEUR || profile.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Administrator access required');
    }
    return profile;
  }

  private async listUsers() {
    const users: Array<{ id: string; name: string; email: string; username?: string | null; createdAt?: Date }> = await this.dataSource.query(
      `SELECT id, name, email, username, "createdAt" FROM "user" ORDER BY "createdAt" DESC`,
    );
    const profiles = await this.profiles.find();
    const map = new Map(profiles.map((profile) => [profile.userId, profile]));
    return Promise.all(users.map(async (user) => {
      const profile = map.get(user.id) ?? await this.ensureProfile(user.id);
      return { ...user, role: profile.role, cooperative: profile.cooperative, status: profile.status };
    }));
  }

  async listForAdmin(actorId: string) {
    await this.requireAdmin(actorId);
    return this.listUsers();
  }

  private async assertAdminContinuity(targetUserId: string, nextRole?: UserRole) {
    const target = await this.ensureProfile(targetUserId);
    if (target.role !== UserRole.ADMINISTRATEUR || nextRole === UserRole.ADMINISTRATEUR) return;
    const adminCount = await this.profiles.count({ where: { role: UserRole.ADMINISTRATEUR, status: UserStatus.ACTIVE } });
    if (adminCount <= 1) throw new BadRequestException('At least one active administrator must remain');
  }

  async update(userId: string, dto: UpdateUserProfileDto) {
    const exists = await this.dataSource.query(`SELECT id, name, email, username, "createdAt" FROM "user" WHERE id = $1 LIMIT 1`, [userId]);
    if (!exists[0]) throw new NotFoundException('User not found');
    const profile = await this.ensureProfile(userId);
    Object.assign(profile, dto);
    await this.profiles.save(profile);
    return { ...exists[0], role: profile.role, cooperative: profile.cooperative, status: profile.status };
  }

  async updateForAdmin(actorId: string, userId: string, dto: UpdateUserProfileDto) {
    await this.requireAdmin(actorId);
    if (actorId === userId && dto.role && dto.role !== UserRole.ADMINISTRATEUR) {
      throw new BadRequestException('You cannot remove your own administrator role');
    }
    if (dto.role) await this.assertAdminContinuity(userId, dto.role);
    return this.update(userId, dto);
  }

  async deleteForAdmin(actorId: string, userId: string) {
    await this.requireAdmin(actorId);
    if (actorId === userId) throw new BadRequestException('You cannot delete your own account');
    const exists = await this.dataSource.query(`SELECT id FROM "user" WHERE id = $1 LIMIT 1`, [userId]);
    if (!exists[0]) throw new NotFoundException('User not found');
    await this.assertAdminContinuity(userId, undefined);

    await this.dataSource.transaction(async (manager) => {
      await manager.query(`DELETE FROM app_user_profile WHERE "userId" = $1`, [userId]);
      await manager.query(`DELETE FROM "session" WHERE "userId" = $1`, [userId]).catch(() => undefined);
      await manager.query(`DELETE FROM "account" WHERE "userId" = $1`, [userId]).catch(() => undefined);
      await manager.query(`DELETE FROM "user" WHERE id = $1`, [userId]);
    });
    return { id: userId, deleted: true };
  }
}
