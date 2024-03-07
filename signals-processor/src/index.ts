import {
  CandleTickData,
  EXCHANGE_TYPES,
  MessageBroker,
  POSITION_EVENTS,
} from '@binance-trader/shared';
import { HEALTHCHECK_PORT, MESSAGE_BROKER_URI } from './config';
import { initDb } from './config/database';
import { initRedis } from './config/redis';
import { processSignals } from './entity/signal/controller';
import logger from './utils/logger';
import http from 'http';

http
  .createServer(function (_, res) {
    res.statusCode = 200;
    res.write('OK');
    res.end();
  })
  .listen(HEALTHCHECK_PORT)
  .on('error', (error) => logger.error(error))
  .on('listening', async () => {
    logger.info('Starting Signals Processor');

    const broker = new MessageBroker({
      exchange: EXCHANGE_TYPES.MAIN,
      uri: MESSAGE_BROKER_URI,
      queue: 'signals-processor',
    });

    const [db, redis] = await Promise.all([
      initDb(),
      initRedis(),
      broker.initializeConnection(),
    ]);

    const terminate = () => {
      logger.info('Exiting Signals Processor');

      Promise.all([db.destroy(), redis.disconnect(), broker.close()]).then(
        () => {
          logger.info('Signals Processor terminated');
          process.exit();
        },
      );
    };

    process.on('SIGINT', terminate);
    process.on('SIGTERM', terminate);
    process.on('unhandledRejection', (reason) => {
      logger.error(reason);
      terminate();
    });

    const msgHandler = async (msg: CandleTickData) => {
      await processSignals({ broker, redis, database: db, candle: msg });
    };

    broker
      .listen(POSITION_EVENTS.POSITION_PROCESSED, msgHandler)
      .catch((error: unknown) => {
        logger.error(error);
        throw error;
      });

    logger.info('Signals Processor started');
  });
