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
   * Lecture seule du profil, sans jamais écrire.
   *
   * `withDeleted` est indispensable ici : sans lui, un profil soft-deleted
   * serait introuvable et retomberait sur le profil implicite — un compte
   * supprimé récupérerait donc un rôle actif. Le `deletedAt` est renvoyé pour
   * que l'appelant puisse refuser explicitement.
   */
  async resolveProfile(
    userId: string,
  ): Promise<
    Pick<UserProfile, 'role' | 'cooperative' | 'status' | 'deletedAt'>
  > {
    const profile = await this.profiles.findOne({
      where: { userId },
      withDeleted: true,
    });
    return profile ?? { ...IMPLICIT_PROFILE, deletedAt: null };
  }

  /** Un compte supprimé ne peut plus ni se connecter ni utiliser l'API. */
  async isDeleted(userId: string): Promise<boolean> {
    const profile = await this.resolveProfile(userId);
    return profile.deletedAt !== null;
  }

  /** Profil de l'utilisateur connecté, projeté sur les seuls champs utiles. */
  async current(userId: string) {
    const { role, cooperative, status } = await this.resolveProfile(userId);
    return { role, cooperative, status };
  }

  /**
   * Liste des comptes. Les comptes supprimés ne sont renvoyés que sur demande
   * explicite (`includeDeleted`), pour permettre leur restauration.
   */
  async list(includeDeleted = false) {
    const users = await this.dataSource.query<AuthUserRow[]>(
      `SELECT ${AUTH_USER_COLUMNS} FROM "user" ORDER BY "createdAt" DESC`,
    );
    const profiles = await this.profiles.find({ withDeleted: true });
    const byUserId = new Map(
      profiles.map((profile) => [profile.userId, profile]),
    );

    return users
      .map((user) => {
        const profile = byUserId.get(user.id) ?? {
          ...IMPLICIT_PROFILE,
          deletedAt: null,
        };
        return {
          ...user,
          role: profile.role,
          cooperative: profile.cooperative,
          status: profile.status,
          deletedAt: profile.deletedAt,
        };
      })
      .filter((user) => includeDeleted || user.deletedAt === null);
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

  /**
   * Suppression réversible d'un compte.
   *
   * Le profil est soft-deleted et son statut passé à `inactive`. Le compte
   * better-auth et ses écritures sont conservés : sans eux, le journal
   * d'audit perdrait l'identité derrière chaque action passée.
   *
   * Les **sessions sont révoquées physiquement** : un jeton de session est un
   * droit d'accès vivant, pas une donnée d'historique. Sans cette révocation,
   * un compte supprimé resterait connecté jusqu'à expiration de son cookie.
   */
  async deleteAsAdmin(actorId: string, userId: string) {
    if (actorId === userId) {
      throw new BadRequestException(
        'Vous ne pouvez pas supprimer votre propre compte.',
      );
    }
    await this.findAuthUser(userId);
    if (await this.isDeleted(userId)) {
      throw new BadRequestException('Ce compte est déjà supprimé.');
    }
    await this.assertAdminContinuity(userId, undefined, UserStatus.INACTIVE);

    const profile = await this.createProfile(userId);
    profile.status = UserStatus.INACTIVE;
    await this.profiles.save(profile);

    await this.dataSource.transaction(async (manager) => {
      await manager.softDelete(UserProfile, { userId });
      await manager.query(`DELETE FROM "session" WHERE "userId" = $1`, [
        userId,
      ]);
    });

    return { id: userId, deleted: true };
  }

  /** Réactive un compte précédemment supprimé. */
  async restoreAsAdmin(userId: string) {
    const user = await this.findAuthUser(userId);
    const profile = await this.profiles.findOne({
      where: { userId },
      withDeleted: true,
    });

    if (!profile?.deletedAt) {
      throw new BadRequestException("Ce compte n'est pas supprimé.");
    }

    await this.profiles.restore({ userId });
    profile.deletedAt = null;
    profile.status = UserStatus.ACTIVE;
    const saved = await this.profiles.save(profile);

    return {
      ...user,
      role: saved.role,
      cooperative: saved.cooperative,
      status: saved.status,
      deletedAt: null,
    };
  }
}
