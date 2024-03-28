import {
  EXCHANGE_TYPES,
  LeanPositionDocument,
  MessageBroker,
  MESSAGE_BROKER_EXCHANGE_TYPES,
  MILLISECONDS,
  POSITION_EVENTS,
  ORDER_EVENTS,
  BINANCE_ORDER_TYPES,
} from '@binance-trader/shared';
import http from 'http';
import getBinanceInstance from '@binance-trader/shared/build/binance-instance-creator';
import {
  BINANCE_API_KEY,
  BINANCE_API_SECRET,
  BINANCE_API_URL,
  BUY_ORDER_TYPE,
  HEALTHCHECK_PORT,
  MESSAGE_BROKER_HOST,
  MESSAGE_BROKER_PASSWORD,
  MESSAGE_BROKER_PROTOCOL,
  MESSAGE_BROKER_USER,
} from './config';
import { initDb } from './config/database';
import {
  createBuyOrder,
  createSellOrder,
  createSellOrderForCanceledOrder,
} from './entity/order/controller';
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
    logger.info('Starting Trader');

    const binance = getBinanceInstance({
      apiUrl: BINANCE_API_URL,
      apiKey: BINANCE_API_KEY,
      apiSecret: BINANCE_API_SECRET,
    });

    const broker = new MessageBroker({
      connectionOptions: {
        protocol: MESSAGE_BROKER_PROTOCOL,
        hostname: MESSAGE_BROKER_HOST,
        username: MESSAGE_BROKER_USER,
        password: MESSAGE_BROKER_PASSWORD,
      },
      exchange: EXCHANGE_TYPES.MAIN,
      queue: 'trader',
    });

    const [db] = await Promise.all([initDb(), broker.initializeConnection()]);

    function terminate(event: NodeJS.Signals | 'error') {
      logger.info({ event }, 'Terminating Trader');

      Promise.all([db.destroy(), broker.close()]).then(() => {
        logger.info('Trader terminated');
        process.exit();
      });
    }

    process.on('SIGINT', terminate);
    process.on('SIGTERM', terminate);
    process.on('unhandledRejection', terminate);
    process.on('uncaughtException', terminate);
    broker.on('error', (error) => {
      logger.error(error);
      terminate('error');
    });

    // =========== DEAD LETTER EXCHANGE ===============

    const brokerChannel = broker.getChannel();

    // create dead letter exchange

    await brokerChannel?.assertExchange(
      EXCHANGE_TYPES.DEAD_LETTER,
      MESSAGE_BROKER_EXCHANGE_TYPES.TOPIC,
      { durable: true },
    );

    // create queue with msg ttl / set dead letter exchange to the main exchange

    const deadLetterQueue = await brokerChannel?.assertQueue(
      'redelivery_queue',
      {
        durable: true,
        deadLetterExchange: EXCHANGE_TYPES.MAIN,
        messageTtl: 60 * MILLISECONDS.SECOND,
      },
    );

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
      logger.error(error);
    };

    // position created

    const handlePositionCreated = async (msg: LeanPositionDocument) => {
      const createdOrder = await createBuyOrder({
        database: db,
        binance,
        position: msg,
      });

      if (createdOrder && BUY_ORDER_TYPE === BINANCE_ORDER_TYPES.MARKET) {
        broker.publish(ORDER_EVENTS.MARKET_BUY_ORDER_CREATED, {
          position_id: msg._id,
          order_id: createdOrder.orderId,
        });
      }
    };

    broker
      .listen(POSITION_EVENTS.POSITION_CREATED, handlePositionCreated, {
        deadLetterExchange: EXCHANGE_TYPES.DEAD_LETTER,
      })
      .catch(errorHandler);

    // position closed
    const handlePositionClosed = (msg: LeanPositionDocument) =>
      createSellOrder({ database: db, binance, position: msg });

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

    logger.info('Trader started');
  });
