import {
  DATABASE_MODELS,
  MarketModel,
  MILLISECONDS,
} from '@binance-trader/shared';
import { Connection } from 'mongoose';

type UpdateMarketLocksProps = {
  database: Connection;
};

export const updateMarketLocks = async function updateMarketLocks({
  database,
}: UpdateMarketLocksProps) {
  const marketModel: MarketModel = database.model(DATABASE_MODELS.MARKET);

  try {
    const locked_markets = await marketModel
      .find({
        $and: [
          { trader_lock: true },
          {
            last_trader_lock_update: {
              $lt: Date.now() - MILLISECONDS.MINUTE,
            },
          },
        ],
      })
      .select({ symbol: true })
      .hint('trader_lock_1_last_trader_lock_update_1')
      .lean();

    if (locked_markets.length > 0) {
      await marketModel
        .updateMany(
          { symbol: { $in: locked_markets.map((m) => m.symbol) } },
          { $set: { trader_lock: false } },
        )
        .hint('symbol_1');
    }
  } catch (error: unknown) {
    console.error(error);
  }
};
