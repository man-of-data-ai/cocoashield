const configuration_root = 'configuration';
const drone_profile_root = `${configuration_root}/drone-profiles`;

export const configuration_routes = {
  root: `${configuration_root}`,
  settings: `${configuration_root}/settings`,
};

export const drone_profile_routes = {
  root: `${drone_profile_root}`,
  details: `${drone_profile_root}/:id`,
  restore: `${drone_profile_root}/:id/restore`,
};
