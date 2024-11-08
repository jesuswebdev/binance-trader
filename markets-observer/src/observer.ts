import ws, { WebSocket } from 'ws';
import {
  CandleTickData,
  MessageBroker,
  EXCHANGE_TYPES,
  CANDLE_EVENTS,
  Pair,
} from '@binance-trader/shared';
import { KlineUpdateEvent } from './utils/interfaces';
import { BINANCE_STREAM_URI, MESSAGE_BROKER_URI } from './config';

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
  constructor({ markets, interval }: constructorOptions) {
    this.markets = markets;
    this.interval = interval;
    this.websocketId = process.pid;
    this.subscriptionParams = markets.map(
      (market) => `${market.symbol.toLowerCase()}@kline_${interval}`,
    );
    this.client = null;
    this.terminating = false;
  }

  private onConnectionOpen() {
    console.log(`${new Date().toISOString()} | Connection open.`);

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
      const k = message.k;
      const candle: CandleTickData = {
        id: `${message.s}_${k.i}_${k.t}`,
        symbol: message.s,
        event_time: message.E || Date.now(),
        open_time: k.t,
        close_time: k.T,
        interval: k.i,
        open_price: +k.o,
        close_price: +k.c,
        high_price: +k.h,
        low_price: +k.l,
        base_asset_volume: +k.v,
        quote_asset_volume: +k.q,
        date: new Date(k.t).toISOString(),
      };

      this.broker?.publish(CANDLE_EVENTS.CANDLE_TICK, candle);
    }
  }

  private onError() {
    console.log(`${new Date().toISOString()} | ERROR`);
    this.broker?.close().then(() => {
      process.exit(1);
    });
  }

  private onConnectionClose() {
    console.log(`[${new Date().toISOString()}] | Stream closed.`);
    this.broker?.close().then(() => {
      if (this.client) {
        this.client.removeAllListeners();
      }

      if (!this.terminating) {
        this.init();
      }
    });
  }

  private terminate() {
    console.log(`[${new Date().toUTCString()}] Terminating Markets Observer`);

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
              throw error;
            }
            client.terminate();

            console.log(
              `[${new Date().toUTCString()}] Markets Observer terminated`,
            );

            process.exit();
          },
        );
      } else {
        console.log(
          `[${new Date().toUTCString()}] Markets Observer terminated`,
        );
        process.exit();
      }
    });
  }

  async init() {
    console.log(`[${new Date().toUTCString()}] Starting Markets Observer`);

    this.broker = new MessageBroker<CandleTickData>({
      exchange: EXCHANGE_TYPES.MAIN,
      uri: MESSAGE_BROKER_URI,
    });

    await this.broker.initializeConnection();

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

    console.log(`[${new Date().toUTCString()}] Markets Observer started`);
  }
}

export { Observer };
