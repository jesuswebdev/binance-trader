import {
  EXCHANGE_TYPES,
  LeanPositionDocument,
  MessageBroker,
  MESSAGE_BROKER_EXCHANGE_TYPES,
  MILLISECONDS,
  POSITION_EVENTS,
} from '@binance-trader/shared';
import getBinanceInstance from '@binance-trader/shared/build/binance-instance-creator';
import {
  BINANCE_API_KEY,
  BINANCE_API_SECRET,
  BINANCE_API_URL,
  MESSAGE_BROKER_URI,
} from './config';
import { initDb } from './config/database';
import {
  createBuyOrder,
  createSellOrder,
  createSellOrderForCanceledOrder,
} from './entity/order/controller';

function logMessage(msg: string) {
  console.log(`[${new Date().toISOString()}] PID (${process.pid}) - ${msg}`);
}

const start = async () => {
  logMessage('Starting Trader');

  const binance = getBinanceInstance({
    apiUrl: BINANCE_API_URL,
    apiKey: BINANCE_API_KEY,
    apiSecret: BINANCE_API_SECRET,
  });

  const broker = new MessageBroker({
    exchange: EXCHANGE_TYPES.MAIN,
    uri: MESSAGE_BROKER_URI,
    queue: 'trader',
  });

  const [db] = await Promise.all([initDb(), broker.initializeConnection()]);

  const terminate = () => {
    logMessage('Exiting Trader');

    Promise.all([db.destroy(), broker.close()]).then(() => {
      logMessage('Trader terminated');
      process.exit();
    });
  };

  process.on('SIGINT', terminate);
  process.on('SIGTERM', terminate);

  // =========== DEAD LETTER EXCHANGE ===============

  const brokerChannel = broker.getChannel();

  // create dead letter exchange

  await brokerChannel?.assertExchange(
    EXCHANGE_TYPES.DEAD_LETTER,
    MESSAGE_BROKER_EXCHANGE_TYPES.TOPIC,
    { durable: true },
  );

  // create queue with msg ttl / set dead letter exchange to the main exchange

  const deadLetterQueue = await brokerChannel?.assertQueue('redelivery_queue', {
    durable: true,
    deadLetterExchange: EXCHANGE_TYPES.MAIN,
    messageTtl: 60 * MILLISECONDS.SECOND,
  });

  // bind queue to dead letter exchange to listen to all messages

  if (!deadLetterQueue) {
    throw new Error('Dead Letter Queue is not defined');
  }

  await brokerChannel?.bindQueue(
    deadLetterQueue.queue,
    EXCHANGE_TYPES.DEAD_LETTER,
    '#',
  );

  // =========== END DEAD LETTER EXCHANGE ===============

  const errorHandler = (error: unknown) => {
    console.error(error);
  };

  // position created

  const handlePositionCreated = async (msg: LeanPositionDocument) => {
    await createBuyOrder({ database: db, binance, position: msg });
  };

  broker
    .listen(POSITION_EVENTS.POSITION_CREATED, handlePositionCreated, {
      deadLetterExchange: EXCHANGE_TYPES.DEAD_LETTER,
    })
    .catch(errorHandler);

  // position closed
  const handlePositionClosed = async (msg: LeanPositionDocument) => {
    await createSellOrder({ database: db, binance, position: msg });
  };

  broker
    .listen(POSITION_EVENTS.POSITION_CLOSED, handlePositionClosed, {
      deadLetterExchange: EXCHANGE_TYPES.DEAD_LETTER,
    })
    .catch(errorHandler);

  // position closed-requeue (unfilled sell order)

  const handlePositionClosedRequeue = async (msg: LeanPositionDocument) => {
    await createSellOrderForCanceledOrder({
      database: db,
      binance,
      position: msg,
    });
  };

  broker
    .listen(
      POSITION_EVENTS.POSITION_CLOSED_REQUEUE,
      handlePositionClosedRequeue,
      { deadLetterExchange: EXCHANGE_TYPES.DEAD_LETTER },
    )
    .catch(errorHandler);

  logMessage('Trader started');
};

start();
