import dotenv from 'dotenv';
import path from 'path';
import joi from 'joi';
import {
  validateObjectSchema,
  ENVIRONMENT_TYPES,
} from '@binance-trader/shared';

if (process.env.NODE_ENV !== ENVIRONMENT_TYPES.PRODUCTION) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

const env = validateObjectSchema(
  process.env,
  joi.object({
    DATABASE_PROTOCOL: joi.string().trim().required(),
    DATABASE_HOST: joi.string().trim().hostname().required(),
    DATABASE_PORT: joi.number().port().required(),
    DATABASE_USERNAME: joi.string().trim().required(),
    DATABASE_PASSWORD: joi.string().trim().required(),
    DATABASE_NAME: joi.string().trim().required(),
    REDIS_HOST: joi.string().trim().hostname().required(),
    REDIS_PORT: joi.number().port().required(),
    MESSAGE_BROKER_PROTOCOL: joi.string().trim().required(),
    MESSAGE_BROKER_HOST: joi.string().trim().hostname().required(),
    MESSAGE_BROKER_USER: joi.string().trim().required(),
    MESSAGE_BROKER_PASSWORD: joi.string().trim().required(),
    SIGNAL_HOURS_LOOKUP: joi.number().integer().positive().default(48),
    LAST_POSITION_HOURS_LOOKUP: joi
      .number()
      .integer()
      .positive()
      .default(365 * 24),
  }),
);

/** NODE_ENV - Defaults to `development` */
export const ENVIRONMENT =
  process.env.NODE_ENV ?? ENVIRONMENT_TYPES.DEVELOPMENT;

export const DATABASE_PROTOCOL = env.DATABASE_PROTOCOL ?? '';
export const DATABASE_HOST = env.DATABASE_HOST ?? '';
export const DATABASE_PORT = +(env.DATABASE_PORT ?? 0);
export const DATABASE_USERNAME = env.DATABASE_USERNAME ?? '';
export const DATABASE_PASSWORD = env.DATABASE_PASSWORD ?? '';
export const DATABASE_NAME = env.DATABASE_NAME ?? '';
export const DATABASE_URI = `${DATABASE_PROTOCOL}://${DATABASE_USERNAME}:${DATABASE_PASSWORD}@${DATABASE_HOST}/${DATABASE_NAME}`;
export const MESSAGE_BROKER_URI =
  `${env.MESSAGE_BROKER_PROTOCOL}://${env.MESSAGE_BROKER_USER}:${env.MESSAGE_BROKER_PASSWORD}@${env.MESSAGE_BROKER_HOST}` ??
  '';
export const REDIS_URI = `redis://${env.REDIS_HOST}:${env.REDIS_PORT}`;

export const SIGNAL_HOURS_LOOKUP = +(env.SIGNAL_HOURS_LOOKUP ?? 0);
export const LAST_POSITION_HOURS_LOOKUP = +(
  env.LAST_POSITION_HOURS_LOOKUP ?? 0
);
