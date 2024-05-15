import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Market } from './market/market.schema';
import { Model } from 'mongoose';
import { Candle, CandleDocument } from './candle/candle.schema';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(Market.name) private readonly marketModel: Model<Market>,
    @InjectModel(Candle.name) private readonly candleModel: Model<Candle>,
  ) {}

  async getStats() {
    const markets = await this.marketModel
      .find()
      .select(['symbol', 'last_price', 'updatedAt'])
      .lean();

    const topN: { _id: string; candles: CandleDocument[] }[] =
      await this.candleModel
        .aggregate([
          {
            $group: {
              _id: '$symbol',
              candles: {
                $topN: {
                  n: 3,
                  sortBy: { open_time: -1 },
                  output: '$$ROOT',
                },
              },
            },
          },
        ])
        .exec();

    const candlesMap: Map<string, CandleDocument[]> = new Map();

    for (const top of topN) {
      candlesMap.set(top._id, top.candles);
    }

    return markets
      .map((market) => {
        const latestCandles = candlesMap.get(market.symbol);

        if (!latestCandles) {
          return;
        }

        return {
          symbol: market.symbol,
          last_market_price: market.last_price,
          last_market_update: market.updatedAt,
          last_candle_update: latestCandles[0].updatedAt,
          volume: latestCandles[0].obv > latestCandles[0].obv_ema,
          volatility: latestCandles[0].ch_atr > latestCandles[0].ch_atr_ema,
          di:
            latestCandles[0].adx > 20 &&
            latestCandles[0].plus_di > 25 &&
            latestCandles[0].plus_di > latestCandles[0].minus_di,
          above_ema: latestCandles[0].close_price > latestCandles[0].ema_50,
          upward_slope: latestCandles.every(
            (candle) => candle.ema_50_slope === 1,
          ),
          green_candles: latestCandles
            .slice(-0, 2)
            .every((candle) => candle.ha_close > candle.ha_open),
          trend: latestCandles[0].trend === 1 && latestCandles[1].trend === 1,
          mesa:
            latestCandles[0].mama > latestCandles[0].fama &&
            latestCandles[1].mama > latestCandles[1].fama,
        };
      })
      .filter((notNull) => notNull);
  }
}
