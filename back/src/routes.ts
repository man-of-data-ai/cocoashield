/**
 * Application routes with its version
 * https://github.com/Sairyss/backend-best-practices#api-versioning
 */

// Api Versions
const v1 = '/v1';

// better-auth mounts its own endpoints (sign-in, sign-up, session, ...) as
// middleware that claims this whole prefix, so nothing else can be routed
// under it - custom auth-adjacent endpoints (like registration) live under
// `users` instead.
const betterAuthBasePath = `${v1}/auth`;

const users = {
  root: '/users',
  register: '/register',
  meProfile: '/me/profile',
  byId: '/:id',
  profileById: '/:id/profile',
  restoreById: '/:id/restore',
};

const parcels = {
  root: '/parcels',
  byId: '/:id',
  analyses: '/:id/analyses',
  verification: '/:id/verification',
  restoreById: '/:id/restore',
};

const analyses = {
  root: '/analyses',
  byId: '/:id',
  restoreById: '/:id/restore',
};

const analysisImages = {
  root: '/analyses-images',
  file: '/:id/file',
};

const exportsRoutes = {
  root: '/exports',
  generate: '/generate',
};

const audit = {
  root: '/audit',
  facets: '/facets',
};

const configuration = {
  root: '/configuration',
  settings: '/settings',
  droneProfiles: '/drone-profiles',
  droneProfileById: '/drone-profiles/:id',
  droneProfileRestoreById: '/drone-profiles/:id/restore',
};

const missions = {
  root: '/missions',
  byId: '/:id',
  restoreById: '/:id/restore',
};

export const routes = {
  version: v1,
  betterAuthBasePath,
  users,
  parcels,
  analyses,
  analysisImages,
  missions,
  exports: exportsRoutes,
  audit,
  configuration,
};
