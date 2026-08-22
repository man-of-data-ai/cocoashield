import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UpdateUserProfileDto } from './dtos/update-user-profile.dto';
import {
  UserProfile,
  UserRole,
  UserStatus,
} from './entities/user-profile.entity';

/** Compte better-auth, tel que stocké par la librairie. */
type AuthUserRow = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  createdAt: Date;
};

const AUTH_USER_COLUMNS = `id, name, email, username, "createdAt"`;

/** Profil implicite d'un compte qui n'a pas encore de ligne applicative. */
const IMPLICIT_PROFILE = {
  role: UserRole.AGRONOME_TERRAIN,
  cooperative: null,
  status: UserStatus.ACTIVE,
} as const;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly profiles: Repository<UserProfile>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Crée le profil applicatif d'un compte. Appelé à l'inscription et par le
   * seed — jamais depuis une lecture.
   *
   * `orIgnore()` rend l'appel idempotent et sûr en concurrence : deux
   * inscriptions simultanées ne violent pas la contrainte d'unicité.
   */
  async createProfile(userId: string): Promise<UserProfile> {
    await this.profiles
      .createQueryBuilder()
      .insert()
      .values({ userId, ...IMPLICIT_PROFILE })
      .orIgnore()
      .execute();
    return this.profiles.findOneOrFail({ where: { userId } });
  }

  /**
   * Lecture seule du profil : renvoie le profil implicite si le compte n'a
   * pas encore de ligne applicative, sans jamais écrire.
   */
  async resolveProfile(
    userId: string,
  ): Promise<Pick<UserProfile, 'role' | 'cooperative' | 'status'>> {
    const profile = await this.profiles.findOne({ where: { userId } });
    return profile ?? { ...IMPLICIT_PROFILE };
  }

  current(userId: string) {
    return this.resolveProfile(userId);
  }

  async list() {
    const users = await this.dataSource.query<AuthUserRow[]>(
      `SELECT ${AUTH_USER_COLUMNS} FROM "user" ORDER BY "createdAt" DESC`,
    );
    const profiles = await this.profiles.find();
    const byUserId = new Map(
      profiles.map((profile) => [profile.userId, profile]),
    );

    return users.map((user) => {
      const profile = byUserId.get(user.id) ?? IMPLICIT_PROFILE;
      return {
        ...user,
        role: profile.role,
        cooperative: profile.cooperative,
        status: profile.status,
      };
    });
  }

  /**
   * Empêche de retirer le dernier administrateur actif de la plateforme, que
   * ce soit par changement de rôle, désactivation ou suppression.
   */
  private async assertAdminContinuity(
    targetUserId: string,
    nextRole?: UserRole,
    nextStatus?: UserStatus,
  ): Promise<void> {
    const target = await this.resolveProfile(targetUserId);
    const staysActiveAdmin =
      (nextRole ?? target.role) === UserRole.ADMINISTRATEUR &&
      (nextStatus ?? target.status) === UserStatus.ACTIVE;

    if (target.role !== UserRole.ADMINISTRATEUR || staysActiveAdmin) {
      return;
    }

    const activeAdmins = await this.profiles.count({
      where: { role: UserRole.ADMINISTRATEUR, status: UserStatus.ACTIVE },
    });
    if (activeAdmins <= 1) {
      throw new BadRequestException(
        'Au moins un administrateur actif doit être conservé.',
      );
    }
  }

  private async findAuthUser(userId: string): Promise<AuthUserRow> {
    const rows = await this.dataSource.query<AuthUserRow[]>(
      `SELECT ${AUTH_USER_COLUMNS} FROM "user" WHERE id = $1 LIMIT 1`,
      [userId],
    );
    if (!rows[0]) {
      throw new NotFoundException('Utilisateur introuvable.');
    }
    return rows[0];
  }

  async update(userId: string, dto: UpdateUserProfileDto) {
    const user = await this.findAuthUser(userId);
    const profile = await this.createProfile(userId);
    Object.assign(profile, dto);
    const saved = await this.profiles.save(profile);
    return {
      ...user,
      role: saved.role,
      cooperative: saved.cooperative,
      status: saved.status,
    };
  }

  async updateAsAdmin(
    actorId: string,
    userId: string,
    dto: UpdateUserProfileDto,
  ) {
    if (
      actorId === userId &&
      dto.role &&
      dto.role !== UserRole.ADMINISTRATEUR
    ) {
      throw new BadRequestException(
        'Vous ne pouvez pas retirer votre propre rôle administrateur.',
      );
    }
    await this.assertAdminContinuity(userId, dto.role, dto.status);
    return this.update(userId, dto);
  }

  async deleteAsAdmin(actorId: string, userId: string) {
    if (actorId === userId) {
      throw new BadRequestException(
        'Vous ne pouvez pas supprimer votre propre compte.',
      );
    }
    await this.findAuthUser(userId);
    await this.assertAdminContinuity(userId, undefined, UserStatus.INACTIVE);

    await this.dataSource.transaction(async (manager) => {
      // Colonnes better-auth en camelCase (créées par la librairie), colonne
      // applicative en snake_case (convention TypeORM du projet).
      await manager.query(`DELETE FROM app_user_profile WHERE user_id = $1`, [
        userId,
      ]);
      await manager.query(`DELETE FROM "session" WHERE "userId" = $1`, [
        userId,
      ]);
      await manager.query(`DELETE FROM "account" WHERE "userId" = $1`, [
        userId,
      ]);
      await manager.query(`DELETE FROM "user" WHERE id = $1`, [userId]);
    });

    return { id: userId, deleted: true };
  }
}
