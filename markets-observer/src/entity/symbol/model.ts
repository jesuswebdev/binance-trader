import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { MarketAttributes } from '@binance-trader/shared';

@Entity({ name: 'markets' })
export default class Market implements MarketAttributes {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  base_asset: string;

  @Column()
  quote_asset: string;

  @Column()
  price_tick_size: number;

  @Column()
  step_size: number;

  @Column()
  symbol: string;

  @Column()
  last_price: number;

  @Column()
  trader_lock: boolean;

  @Column()
  last_trader_lock_update: number;

  @Column()
  enabled: boolean;

  @Column()
  use_test_account: boolean;
}
