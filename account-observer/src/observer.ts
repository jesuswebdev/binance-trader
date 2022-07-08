import ws from 'ws';
import {
  AccountModel,
  DATABASE_MODELS,
  LeanAccountDocument,
  MILLISECONDS,
  nz,
  OrderModel,
  PAIRS,
} from '@binance-trader/shared';
import { Connection } from 'mongoose';
import { AxiosInstance } from 'axios';
import { parseAccountUpdate, parseOrder } from './utils';
import { BINANCE_STREAM_URI, ENVIRONMENT } from './config';

function logMessage(msg: string) {
  console.log(`[${new Date().toISOString()}] PID (${process.pid}) - ${msg}`);
}
export default class AccountObserver {
  private readonly allowed_pairs: Map<string, boolean>;
  private listenKeyKeepAliveInterval: NodeJS.Timer | null;
  private client: ws.WebSocket | undefined;
  private terminating: boolean;
  constructor(
    private readonly database: Connection,
    private readonly binance: AxiosInstance,
  ) {
    this.allowed_pairs = new Map();

    for (const pair of PAIRS) {
      this.allowed_pairs.set(pair.symbol, true);
    }

    this.listenKeyKeepAliveInterval = null;
    this.terminating = false;
  }

  startListenKeyKeepAliveInterval() {
    this.listenKeyKeepAliveInterval = setInterval(async () => {
      const account: LeanAccountDocument = await this.database
        .model<AccountModel>(DATABASE_MODELS.ACCOUNT)
        .findOne({ id: ENVIRONMENT })
        .hint('id_1')
        .select({ spot_account_listen_key: true })
        .lean();

      await this.listenKeyKeepAlive(account.spot_account_listen_key);

      await this.database
        .model<AccountModel>(DATABASE_MODELS.ACCOUNT)
        .updateOne(
          { id: ENVIRONMENT },
          { $set: { last_spot_account_listen_key_update: Date.now() } },
        )
        .hint('id_1');
    }, MILLISECONDS.MINUTE * 30);
  }

  stopListenKeyKeepAliveInterval() {
    if (this.listenKeyKeepAliveInterval) {
      clearInterval(this.listenKeyKeepAliveInterval);
    }
  }

  async createListenKey(): Promise<string | undefined> {
    const { data } = await this.binance.post('/api/v3/userDataStream');

    return data?.listenKey;
  }

  async listenKeyKeepAlive(listenKey: string) {
    const query = new URLSearchParams({ listenKey }).toString();
    await this.binance.put(`/api/v3/userDataStream?${query}`);

    return null;
  }

  async getAccountBalance() {
    const { data: account } = await this.binance.get('/api/v3/account');

    return (account.balances as { asset: string; free: string }[]).map(
      (balance) => ({
        asset: balance.asset,
        free: nz(+(balance?.free ?? 0)),
      }),
    );
  }

  async updateBalance() {
    const balances = await this.getAccountBalance();
    await this.database
      .model<AccountModel>(DATABASE_MODELS.ACCOUNT)
      .updateOne({ id: ENVIRONMENT }, { $set: { balances } }, { upsert: true })
      .hint('id_1');
  }

  async getListenKey() {
    const account: LeanAccountDocument = await this.database
      .model<AccountModel>(DATABASE_MODELS.ACCOUNT)
      .findOne({ id: ENVIRONMENT })
      .hint('id_1')
      .select({ spot_account_listen_key: true })
      .lean();
    let spot_account_listen_key: string | undefined;

    try {
      spot_account_listen_key = await this.createListenKey();
    } catch (error) {
      console.error(error);
      spot_account_listen_key = await this.createListenKey();
    }

    if (!spot_account_listen_key) {
      throw new Error('No listen key returned from binance.');
    }

    if (account.spot_account_listen_key !== spot_account_listen_key) {
      console.log('Using new listen key.');
    }

    await this.database
      .model<AccountModel>(DATABASE_MODELS.ACCOUNT)
      .updateOne({ id: ENVIRONMENT }, { $set: { spot_account_listen_key } })
      .hint('id_1');

    this.startListenKeyKeepAliveInterval();

    return spot_account_listen_key;
  }

  async init() {
    logMessage('Starting Account Observer');

    await this.updateBalance();
    const spot_account_listen_key = await this.getListenKey();

    this.client = new ws(
      `${BINANCE_STREAM_URI}/stream?streams=${spot_account_listen_key}`,
    );

    this.client.on('open', () => {
      logMessage('Spot Account Observer | Connection open');
    });

    this.client.on('ping', () => {
      this.client?.pong();
    });

    this.client.on('message', async (data: unknown) => {
      const parsedData = JSON.parse(data as string);
      const message = parsedData.data;

      if (message.e === 'executionReport') {
        const parsedOrder = parseOrder(message);
        const validPair = this.allowed_pairs.get(parsedOrder.symbol ?? '');

        if (parsedOrder.orderId && validPair) {
          try {
            await this.database
              .model<OrderModel>(DATABASE_MODELS.ORDER)
              .updateOne(
                {
                  $and: [
                    { orderId: parsedOrder.orderId },
                    { symbol: parsedOrder.symbol },
                  ],
                },
                { $set: parsedOrder },
                { upsert: true },
              )
              .hint('orderId_-1_symbol_-1');
          } catch (error) {
            console.error(error);
            await this.database
              .model<OrderModel>(DATABASE_MODELS.ORDER)
              .updateOne(
                {
                  $and: [
                    { orderId: parsedOrder.orderId },
                    { symbol: parsedOrder.symbol },
                  ],
                },
                { $set: parsedOrder },
                { upsert: true },
              )
              .hint('orderId_-1_symbol_-1');
          }
        }
      }

      if (message.e === 'outboundAccountPosition') {
        const update = parseAccountUpdate(message);

        await this.database
          .model<AccountModel>(DATABASE_MODELS.ACCOUNT)
          .bulkWrite(
            update.map((value) => ({
              updateOne: {
                filter: { id: ENVIRONMENT },
                update: { $set: { 'balances.$[elem]': value } },
                arrayFilters: [{ 'elem.asset': { $eq: value.asset } }],
                hint: 'id_1',
              },
            })),
            { ordered: false },
          );
      }
    });

    this.client.on('error', () => {
      logMessage('Spot Orders Observer | ERROR');
      process.exit();
    });

    this.client.on('close', (code, reason) => {
      logMessage('Spot Orders Observer Stream closed');
      logMessage(`Code: ${code}, Reason: ${reason.toString()}`);

      if (!this.terminating) {
        this.init();
      }
    });

    process.on('SIGINT', this.terminate.bind(this));
    process.on('SIGTERM', this.terminate.bind(this));
  }

  private terminate() {
    logMessage('Terminating Account Observer');

    const client = this.client;

    if (client && client.readyState === ws.OPEN) {
      this.terminating = true;

      client.terminate();

      logMessage('Account Observer terminated');

      process.exit();
    }
  }
}
