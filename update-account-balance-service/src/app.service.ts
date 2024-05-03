import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { Account } from './account/account.schema';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Market } from './market/market.schema';
import { nz } from '@binance-trader/shared';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(Account.name) private readonly accountModel: Model<Account>,
    @InjectModel(Market.name) private readonly marketModel: Model<Market>,
    private readonly configService: ConfigService,
  ) {}

  @Cron('0 */8 * * *')
  async updateAccountBalances() {
    const markets = await this.marketModel
      .find()
      .select({ base_asset: true, last_price: true });

    const marketsMap: Map<string, number> = new Map();

    for (const market of markets) {
      marketsMap.set(market.base_asset, market.last_price);
    }

    const account = await this.accountModel
      .findOne({ id: this.configService.get('NODE_ENV') })
      .select({ balances: true });

    const [{ free: freeUsdt }] = account.balances.filter(
      (balance) => balance.asset === 'USDT',
    );

    const nonUsdtBalances = account.balances.filter(
      (balance) => balance.asset !== 'USDT',
    );

    let usdtFromOpenPositions = 0;

    for (const balance of nonUsdtBalances) {
      usdtFromOpenPositions += nz(balance.free * marketsMap.get(balance.asset));
    }

    await this.accountModel.updateOne(
      { id: this.configService.get('NODE_ENV') },
      { $set: { total_balance: usdtFromOpenPositions + freeUsdt } },
    );
  }
}
