import Joi from 'joi';
import { Constants } from '../../constants/constants';

export const CONFIG_SCHEMA = Joi.object({
  NODE_ENV: Joi.string()
    .valid(
      Constants.ENVIRONMENT.DEVELOPMENT,
      Constants.ENVIRONMENT.STAGING,
      Constants.ENVIRONMENT.PRODUCTION,
      Constants.ENVIRONMENT.TEST,
    )
    .default(Constants.ENVIRONMENT.DEVELOPMENT),
  APP_NAME: Joi.string().required(),
  PORT: Joi.number().default(3000),

  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_USERNAME: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),

  BETTER_AUTH_SECRET: Joi.string().min(32).required(),
  BETTER_AUTH_URL: Joi.string().uri().required(),

  // Origine du frontend, approuvée par better-auth pour les appels
  // cross-origin (le proxy Next.js interroge le backend directement).
  WEB_URL: Joi.string().uri().default('http://localhost:3002'),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),

  UPLOADS_DIR: Joi.string().default('./uploads'),

  // Modèle d'inférence ONNX. Le défaut pointe sur l'artefact du monorepo pour
  // le développement ; en production l'image Docker fixe MODEL_PATH sur le
  // modèle téléchargé depuis la release GitHub, empreinte vérifiée.
  MODEL_PATH: Joi.string().default('../model/v3/cocoashield_v3.onnx'),
  MODEL_VERSION: Joi.string().default('v3'),
}).unknown(true);
