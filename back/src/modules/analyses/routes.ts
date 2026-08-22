const analysis_root = 'analyses';
const analysis_image_root = 'analyses-images';

export const analysis_routes = {
  root: `${analysis_root}`,
  details: `${analysis_root}/:id`,
  restore: `${analysis_root}/:id/restore`,
};

export const analysis_image_routes = {
  file: `${analysis_image_root}/:id/file`,
};
