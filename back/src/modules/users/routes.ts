const user_root = 'users';

export const user_routes = {
  root: `${user_root}`,
  details: `${user_root}/:id`,
  restore: `${user_root}/:id/restore`,
  profile: `${user_root}/:id/profile`,
  me_profile: `${user_root}/me/profile`,
};
