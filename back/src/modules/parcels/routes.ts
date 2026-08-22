const parcel_root = 'parcels';

export const parcel_routes = {
  root: `${parcel_root}`,
  details: `${parcel_root}/:id`,
  restore: `${parcel_root}/:id/restore`,
  verification: `${parcel_root}/:id/verification`,
  analyses: `${parcel_root}/:id/analyses`,
};
