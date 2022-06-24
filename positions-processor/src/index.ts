import {
  CandleTickData,
  CANDLE_EVENTS,
  EXCHANGE_TYPES,
  MessageBroker,
  POSITION_EVENTS,
} from '@binance-trader/shared';
import { MESSAGE_BROKER_URI } from './config';
import { initDb } from './config/database';
import { processOpenPositions } from './entity/position/controller';

const start = async () => {
  const broker = new MessageBroker({
    exchange: EXCHANGE_TYPES.MAIN,
    uri: MESSAGE_BROKER_URI,
    queue: 'positions-processor',
  });

  const [db] = await Promise.all([initDb(), broker.initializeConnection()]);

  const msgHandler = async (data: CandleTickData) => {
    await processOpenPositions({ database: db, candle: data, broker });
    broker.publish(POSITION_EVENTS.POSITION_PROCESSED, data);
  };

  broker
    .listen(CANDLE_EVENTS.CANDLE_PROCESSED, msgHandler)
    .catch((error: unknown) => console.error(error));
};

start();
