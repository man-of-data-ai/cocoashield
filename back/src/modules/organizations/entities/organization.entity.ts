import { Column, Entity, Index } from 'typeorm';
import { RestEntity } from '../../../libs/infrastructure/persistence/entities/rest.entity';

export enum OrganizationType { COOPERATIVE='cooperative', COMPANY='company', DIRECTION='direction', PRODUCER='producer' }
export enum ServiceOffer { SAAS_PONCTUEL='saas_ponctuel', SAAS_ANNUEL='saas_annuel', SAAS_BYOD='saas_byod', ON_PREMISE='on_premise' }

@Entity('organization')
export class Organization extends RestEntity {
  @Index({ unique: true }) @Column() name: string;
  @Column({ type:'enum', enum: OrganizationType }) type: OrganizationType;
  @Column({ type:'enum', enum: ServiceOffer }) offer: ServiceOffer;
  @Column({ type:'varchar', nullable:true }) email: string | null;
  @Column({ type:'varchar', nullable:true }) phone: string | null;
  @Column({ default:true }) active: boolean;
}
