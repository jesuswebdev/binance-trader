import {
  CandleTickData,
  CANDLE_EVENTS,
  EXCHANGE_TYPES,
  MessageBroker,
  POSITION_EVENTS,
  SignalAttributes,
  SIGNAL_EVENTS,
} from '@binance-trader/shared';
import http from 'http';
import { HEALTHCHECK_PORT, MESSAGE_BROKER_URI } from './config';
import { initDb } from './config/database';
import {
  createPosition,
  processOpenPositions,
} from './entity/position/controller';
import logger from './utils/logger';

http
  .createServer(function (_, res) {
    res.statusCode = 200;
    res.write('OK');
    res.end();
  })
  .listen(HEALTHCHECK_PORT)
  .on('error', (error) => logger.error(error))
  .on('listening', async () => {
    logger.info('Starting Positions Processor');

    const broker = new MessageBroker({
      exchange: EXCHANGE_TYPES.MAIN,
      uri: MESSAGE_BROKER_URI,
      queue: 'positions-processor',
    });

    const [db] = await Promise.all([initDb(), broker.initializeConnection()]);

    const terminate = () => {
      logger.info('Exiting Candles Processor');

      Promise.all([db.destroy(), broker.close()]).then(() => {
        logger.info('Candles Processor terminated');
        process.exit(1);
      });
    };

    process.on('SIGINT', terminate);
    process.on('SIGTERM', terminate);
    process.on('unhandledRejection', (reason) => {
      logger.error(reason);
      terminate();
    });

    const candleProcessedHandler = async (data: CandleTickData) => {
      await processOpenPositions({ database: db, candle: data, broker });
      broker.publish(POSITION_EVENTS.POSITION_PROCESSED, data);
    };

    const signalClosedHandler = async (data: SignalAttributes) => {
      await createPosition({ database: db, broker, signal: data });
    };

    broker
      .listen(CANDLE_EVENTS.CANDLE_PROCESSED, candleProcessedHandler)
      .catch((error: unknown) => logger.error(error));

    broker
      .listen(SIGNAL_EVENTS.SIGNAL_CLOSED, signalClosedHandler)
      .catch((error: unknown) => logger.error(error));

    logger.info('Positions Processor started');
  });
