import { apiRequest } from '@/lib/api-client';
export type OrganizationType='cooperative'|'company'|'direction'|'producer';
export type ServiceOffer='saas_ponctuel'|'saas_annuel'|'saas_byod'|'on_premise';
export type Organization={id:string;name:string;type:OrganizationType;offer:ServiceOffer;email:string|null;phone:string|null;active:boolean};
export type OrganizationInput={name:string;type:OrganizationType;offer:ServiceOffer;email?:string|null;phone?:string|null;active?:boolean};
export const organizationService={
  list:(includeInactive=false)=>apiRequest<Organization[]>(`/v1/organizations${includeInactive?'?includeInactive=true':''}`),
  create:(input:OrganizationInput)=>apiRequest<Organization>('/v1/organizations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}),
  update:(id:string,input:Partial<OrganizationInput>)=>apiRequest<Organization>(`/v1/organizations/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}),
};
export const OFFER_LABELS:Record<ServiceOffer,string>={saas_ponctuel:'SaaS Ponctuel',saas_annuel:'SaaS Abonnement Annuel',saas_byod:'SaaS BYOD',on_premise:'On-Premise'};
export const TYPE_LABELS:Record<OrganizationType,string>={cooperative:'Coopérative',company:'Société',direction:'Direction / institution',producer:'Producteur'};
export const AUTONOMOUS_ADMIN_OFFERS:ServiceOffer[]=['saas_byod','on_premise'];
