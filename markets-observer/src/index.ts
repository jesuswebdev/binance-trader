import {
  DATABASE_MODELS,
  LeanMarketDocument,
  MarketModel,
} from '@binance-trader/shared';
import { CANDLE_INTERVAL } from './config';
import { initDb } from './config/database';
import { Observer } from './observer';

const start = async () => {
  const db = await initDb();

  const marketModel: MarketModel = db.model(DATABASE_MODELS.MARKET);

  const markets: LeanMarketDocument[] = await marketModel
    .find()
    .select({ symbol: true })
    .lean();

  await db.destroy();

  if (markets.length > 0) {
    const observer = new Observer({ markets, interval: CANDLE_INTERVAL });

    observer.init();
  } else {
    console.log('No markets found');
  }
};

start();
