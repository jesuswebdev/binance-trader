import dotenv from 'dotenv';
import path from 'path';
import joi from 'joi';
import {
  validateObjectSchema,
  ENVIRONMENT_TYPES,
} from '@binance-trader/shared';

dotenv.config({
  path: path.resolve(
    __dirname,
    `../../.env.${process.env.NODE_ENV ?? ENVIRONMENT_TYPES.DEVELOPMENT}`,
  ),
});

const env = validateObjectSchema(
  process.env,
  joi.object({
    NODE_ENV: joi
      .string()
      .allow(...Object.values(ENVIRONMENT_TYPES))
      .only()
      .required(),
    DATABASE_PROTOCOL: joi.string().trim().required(),
    DATABASE_HOST: joi.string().trim().hostname().required(),
    DATABASE_PORT: joi.number().port().required(),
    DATABASE_USERNAME: joi.string().trim().required(),
    DATABASE_PASSWORD: joi.string().trim().required(),
    DATABASE_NAME: joi.string().trim().required(),
    BINANCE_STREAM_URI: joi.string().trim().uri().required(),
    BINANCE_API_URL: joi.string().trim().uri().required(),
    BINANCE_API_KEY: joi.string().trim().base64().required(),
    BINANCE_API_SECRET: joi.string().trim().base64().required(),
    HEALTHCHECK_PORT: joi.number().port().default(8080),
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

export const BINANCE_STREAM_URI = env.BINANCE_STREAM_URI ?? '';
export const BINANCE_API_URL = env.BINANCE_API_URL ?? '';
export const BINANCE_API_KEY = env.BINANCE_API_KEY ?? '';
export const BINANCE_API_SECRET = env.BINANCE_API_SECRET ?? '';
export const HEALTHCHECK_PORT = env.HEALTHCHECK_PORT;
