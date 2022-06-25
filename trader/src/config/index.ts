import dotenv from 'dotenv';
import path from 'path';
import joi from 'joi';
import {
  validateObjectSchema,
  ENVIRONMENT_TYPES,
  MILLISECONDS,
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
    MESSAGE_BROKER_PROTOCOL: joi.string().trim().required(),
    MESSAGE_BROKER_HOST: joi.string().trim().hostname().required(),
    MESSAGE_BROKER_USER: joi.string().trim().required(),
    MESSAGE_BROKER_PASSWORD: joi.string().trim().required(),
    BINANCE_API_URL: joi.string().trim().uri().required(),
    BINANCE_API_KEY: joi.string().trim().base64().required(),
    BINANCE_API_SECRET: joi.string().trim().base64().required(),
    BINANCE_MINIMUM_ORDER_SIZE: joi.number().positive().greater(0).required(),
    BUY_ORDER_TTL: joi.number().integer().positive().greater(0).default(600),
    SELL_ORDER_TTL: joi.number().integer().positive().greater(0).default(600),
    MINUTES_BETWEEN_CANCEL_ATTEMPTS: joi
      .number()
      .integer()
      .positive()
      .greater(0)
      .default(15),
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

export const BINANCE_MINIMUM_ORDER_SIZE = +(
  env.BINANCE_MINIMUM_ORDER_SIZE ?? 0
);
export const BUY_ORDER_TTL = +(env.BUY_ORDER_TTL ?? 0) * MILLISECONDS.SECOND;
export const SELL_ORDER_TTL = +(env.SELL_ORDER_TTL ?? 0) * MILLISECONDS.SECOND;
export const MINUTES_BETWEEN_CANCEL_ATTEMPTS =
  +(env.MINUTES_BETWEEN_CANCEL_ATTEMPTS ?? 0) * MILLISECONDS.MINUTE;

export const BINANCE_API_URL = env.BINANCE_API_URL ?? '';
export const BINANCE_API_KEY = env.BINANCE_API_KEY ?? '';
export const BINANCE_API_SECRET = env.BINANCE_API_SECRET ?? '';
