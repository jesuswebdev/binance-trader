import dotenv from 'dotenv';
import path from 'path';
import joi from 'joi';
import './modules-declaration';
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
    HOST: joi.string().trim().hostname().default('0.0.0.0'),
    PORT: joi.number().port().default(8080),
    DATABASE_HOST: joi.string().trim().hostname().required(),
    DATABASE_PORT: joi.number().port().required(),
    DATABASE_USERNAME: joi.string().trim().required(),
    DATABASE_PASSWORD: joi.string().trim().required(),
    DATABASE_NAME: joi.string().trim().required(),
  }),
);

/** NODE_ENV - Defaults to `development` */
export const ENVIRONMENT =
  process.env.NODE_ENV ?? ENVIRONMENT_TYPES.DEVELOPMENT;
export const HOST = env.HOST ?? '';
export const PORT = +(env.PORT ?? 0);
export const DATABASE_HOST = env.DATABASE_HOST ?? '';
export const DATABASE_PORT = +(env.DATABASE_PORT ?? 0);
export const DATABASE_USERNAME = env.DATABASE_USERNAME ?? '';
export const DATABASE_PASSWORD = env.DATABASE_PASSWORD ?? '';
export const DATABASE_NAME = env.DATABASE_NAME ?? '';
