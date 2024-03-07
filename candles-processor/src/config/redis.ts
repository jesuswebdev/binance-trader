import {
  createClient,
  RedisClientType,
  RedisFunctions,
  RedisModules,
  RedisScripts,
} from 'redis';
import { REDIS_URI } from '.';
import logger from '../utils/logger';

type InitializeRedisResponse = Promise<
  RedisClientType<RedisModules, RedisFunctions, RedisScripts>
>;

export function initRedis(): InitializeRedisResponse {
  return new Promise((resolve, reject) => {
    const client = createClient({ url: REDIS_URI });
    client.on('error', (error: unknown) => reject(error));
    client.on('ready', () => {
      logger.info('Redis connection established');

      return resolve(client);
    });
    client.connect();
  });
}
