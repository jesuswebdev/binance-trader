import {
  CandleTickData,
  EXCHANGE_TYPES,
  MessageBroker,
  POSITION_EVENTS,
} from '@binance-trader/shared';
import { MESSAGE_BROKER_URI } from './config';
import { initDb } from './config/database';
import { initRedis } from './config/redis';
import { processSignals } from './entity/signal/controller';

function logMessage(msg: string) {
  console.log(`[${new Date().toISOString()}] PID (${process.pid}) - ${msg}`);
}

const start = async () => {
  logMessage('Starting Signals Processor');

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
    logMessage('Exiting Signals Processor');

    Promise.all([db.destroy(), redis.disconnect(), broker.close()]).then(() => {
      logMessage('Signals Processor terminated');
      process.exit();
    });
  };

  process.on('SIGINT', terminate);
  process.on('SIGTERM', terminate);
  process.on('unhandledRejection', (reason) => {
    console.error(reason);
    terminate();
  });

  const msgHandler = async (msg: CandleTickData) => {
    await processSignals({ broker, redis, database: db, candle: msg });
  };

  broker
    .listen(POSITION_EVENTS.POSITION_PROCESSED, msgHandler)
    .catch((error: unknown) => {
      console.error(error);
      throw error;
    });

  logMessage('Signals Processor started');
};

start();
