import { Column, Entity, Index, Unique } from 'typeorm';
import { RestEntity } from '../../../libs/infrastructure/persistence/entities/rest.entity';

@Entity('admin_organization')
@Unique(['userId', 'organizationId'])
export class AdminOrganization extends RestEntity {
  @Index()
  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @Index()
  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;
}
