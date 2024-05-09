import ws, { WebSocket } from 'ws';
import {
  CandleTickData,
  MessageBroker,
  EXCHANGE_TYPES,
  CANDLE_EVENTS,
  Pair,
} from '@binance-trader/shared';
import { KlineUpdateEvent } from './utils/interfaces';
import {
  BINANCE_STREAM_URI,
  MESSAGE_BROKER_HOST,
  MESSAGE_BROKER_PASSWORD,
  MESSAGE_BROKER_PROTOCOL,
  MESSAGE_BROKER_USER,
} from './config';
import logger from './utils/logger';

interface constructorOptions {
  markets: Pair[];
  interval: string;
}

class Observer {
  private markets: Pair[];
  private interval: string;
  private client: WebSocket | null;
  private websocketId: number;
  private subscriptionParams: string[];
  private terminating: boolean;
  private broker: MessageBroker<CandleTickData> | undefined;
  private stats: Record<string, number>;
  private statsInterval: NodeJS.Timer;
  constructor({ markets, interval }: constructorOptions) {
    this.markets = markets;
    this.interval = interval;
    this.websocketId = process.pid;
    this.subscriptionParams = markets.map(
      (market) => `${market.symbol.toLowerCase()}@kline_${interval}`,
    );
    this.client = null;
    this.terminating = false;
    this.stats = {};
  }

  private onConnectionOpen() {
    logger.info('Connection open');

    this.client?.send(
      JSON.stringify({
        method: 'SUBSCRIBE',
        params: this.subscriptionParams,
        id: this.websocketId,
      }),
      (error: unknown) => {
        if (error) {
          throw error;
        }
      },
    );
  }

  private onPing() {
    this.client?.pong();
  }

  private onMessage(data: ws.RawData) {
    const message: KlineUpdateEvent = (JSON.parse(data.toString()) || {}).data;

    if (message?.e === 'kline') {
      const kline = message.k;
      const candle: CandleTickData = {
        id: `${message.s}_${kline.i}_${kline.t}`,
        symbol: message.s,
        event_time: message.E || Date.now(),
        open_time: kline.t,
        close_time: kline.T,
        interval: kline.i,
        open_price: +kline.o,
        close_price: +kline.c,
        high_price: +kline.h,
        low_price: +kline.l,
        base_asset_volume: +kline.v,
        quote_asset_volume: +kline.q,
        date: new Date(kline.t).toISOString(),
      };

      this.updateSymbolStats(candle.symbol);

      this.broker?.publish(CANDLE_EVENTS.CANDLE_TICK, candle);
    }
  }

  private onError(error: Error) {
    logger.error(error);
    this.broker?.close().then(() => {
      process.exit(1);
    });
  }

  private onConnectionClose() {
    logger.info('Stream closed');
    this.broker?.close().then(() => {
      if (this.client) {
        this.client.removeAllListeners();
      }

      this.stopStatsInterval();

      if (!this.terminating) {
        this.init();
      }
    });
  }

  private terminate(event: NodeJS.Signals | 'error') {
    logger.info({ event }, 'Terminating Markets Observer');

    this.broker?.close().then(() => {
      const client = this.client;

      if (client && client.readyState === ws.OPEN) {
        this.terminating = true;
        client.send(
          JSON.stringify({
            method: 'UNSUBSCRIBE',
            params: this.subscriptionParams,
            id: this.websocketId,
          }),
          (error) => {
            if (error) {
              logger.error(error);
              throw error;
            }
            client.terminate();

            logger.info('Markets Observer terminated');

            process.exit();
          },
        );
      } else {
        logger.info('Markets Observer terminated');
        process.exit();
      }
    });
  }

  async init() {
    logger.info('Starting Markets Observer');

    this.initializeStatsInterval();

    this.broker = new MessageBroker<CandleTickData>({
      exchange: EXCHANGE_TYPES.MAIN,
      connectionOptions: {
        protocol: MESSAGE_BROKER_PROTOCOL,
        hostname: MESSAGE_BROKER_HOST,
        username: MESSAGE_BROKER_USER,
        password: MESSAGE_BROKER_PASSWORD,
      },
    });

    await this.broker.initializeConnection();

    logger.info('Broker connection initialized');

    this.client = new ws(
      `${BINANCE_STREAM_URI}/stream?streams=${this.markets
        .map((market) => `${market.symbol}@kline_${this.interval}`)
        .join('/')}`,
    );

    this.client.on('open', this.onConnectionOpen.bind(this));
    this.client.on('message', this.onMessage.bind(this));
    this.client.on('error', this.onError.bind(this));
    this.client.on('close', this.onConnectionClose.bind(this));
    this.client.on('ping', this.onPing.bind(this));

    process.on('SIGINT', this.terminate.bind(this));
    process.on('SIGTERM', this.terminate.bind(this));
    process.on('unhandledRejection', this.terminate.bind(this));
    process.on('uncaughtException', this.terminate.bind(this));
    this.broker.on('error', (error) => {
      logger.error(error);
      this.terminate('error');
    });

    logger.info('Markets Observer started');
  }

  private initializeStatsInterval() {
    this.statsInterval = setInterval(
      () => {
        logger.info(this.stats, 'Last hour stats');

        if (Object.keys(this.stats).length === 0) {
          logger.info(
            'Did not receive candles updates in the last hour. Terminating container',
          );

          this.terminate('error');
        }

        // reset stats
        this.stats = {};
      },
      1000 * 60 * 60,
    );
  }

  private stopStatsInterval() {
    clearInterval(this.statsInterval);
  }

  private updateSymbolStats(symbol: string) {
    this.stats[symbol] = (this.stats[symbol] ?? 0) + 1;
  }
}

export { Observer };
