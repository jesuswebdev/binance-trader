import {
  CandleTickData,
  CANDLE_EVENTS,
  EXCHANGE_TYPES,
  MessageBroker,
  POSITION_EVENTS,
  SignalAttributes,
  SIGNAL_EVENTS,
} from '@binance-trader/shared';
import { MESSAGE_BROKER_URI } from './config';
import { initDb } from './config/database';
import {
  createPosition,
  processOpenPositions,
} from './entity/position/controller';

function logMessage(msg: string) {
  console.log(`[${new Date().toISOString()}] PID (${process.pid}) - ${msg}`);
}

const start = async () => {
  logMessage('Starting Positions Processor');

  const broker = new MessageBroker({
    exchange: EXCHANGE_TYPES.MAIN,
    uri: MESSAGE_BROKER_URI,
    queue: 'positions-processor',
  });

  const [db] = await Promise.all([initDb(), broker.initializeConnection()]);

  const terminate = () => {
    logMessage('Exiting Candles Processor');

    Promise.all([db.destroy(), broker.close()]).then(() => {
      logMessage('Candles Processor terminated');
      process.exit();
    });
  };

  process.on('SIGINT', terminate);
  process.on('SIGTERM', terminate);

  const candleProcessedHandler = async (data: CandleTickData) => {
    await processOpenPositions({ database: db, candle: data, broker });
    broker.publish(POSITION_EVENTS.POSITION_PROCESSED, data);
  };

  const signalClosedHandler = async (data: SignalAttributes) => {
    await createPosition({ database: db, broker, signal: data });
  };

  broker
    .listen(CANDLE_EVENTS.CANDLE_PROCESSED, candleProcessedHandler)
    .catch((error: unknown) => console.error(error));

  broker
    .listen(SIGNAL_EVENTS.SIGNAL_CLOSED, signalClosedHandler)
    .catch((error: unknown) => console.error(error));

  logMessage('Positions Processor started');
};

start();
