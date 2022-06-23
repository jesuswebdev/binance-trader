import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

const tableName = 'candles';

export class migration1655956455957 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: tableName,
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '255',
            isPrimary: true,
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'symbol',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'open_time',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'close_time',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'interval',
            type: 'varchar',
            length: '4',
            isNullable: false,
          },
          {
            name: 'open_price',
            type: 'decimal',
            precision: 16,
            scale: 8,
            isNullable: false,
          },
          {
            name: 'close_price',
            type: 'decimal',
            precision: 16,
            scale: 8,
            isNullable: false,
          },
          {
            name: 'high_price',
            type: 'decimal',
            precision: 16,
            scale: 8,
            isNullable: false,
          },
          {
            name: 'low_price',
            type: 'decimal',
            precision: 16,
            scale: 8,
            isNullable: false,
          },
          {
            name: 'base_asset_volume',
            type: 'decimal',
            precision: 48,
            scale: 8,
            isNullable: false,
          },
          {
            name: 'quote_asset_volume',
            type: 'decimal',
            precision: 48,
            scale: 8,
            isNullable: false,
          },
          {
            name: 'date',
            type: 'varchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'macd',
            type: 'decimal',
            precision: 16,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'macd_signal',
            type: 'decimal',
            precision: 16,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'macd_histogram',
            type: 'decimal',
            precision: 16,
            scale: 8,
            isNullable: true,
          },

          {
            name: 'mama',
            type: 'decimal',
            precision: 16,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'fama',
            type: 'decimal',
            precision: 16,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'atr',
            type: 'decimal',
            precision: 16,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'atr_stop',
            type: 'decimal',
            precision: 16,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'atr_sma',
            type: 'decimal',
            precision: 16,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'event_time',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'trend',
            type: 'enum',
            enum: ['1', '-1'],
            isNullable: true,
          },
          {
            name: 'trend_up',
            type: 'decimal',
            precision: 16,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'trend_down',
            type: 'decimal',
            precision: 16,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'adx',
            type: 'decimal',
            precision: 16,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'plus_di',
            type: 'decimal',
            precision: 16,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'minus_di',
            type: 'decimal',
            precision: 16,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'obv',
            type: 'decimal',
            precision: 48,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'obv_ema',
            type: 'decimal',
            precision: 48,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'ch_atr',
            type: 'decimal',
            precision: 16,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'ch_atr_ema',
            type: 'decimal',
            precision: 16,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'ema_50',
            type: 'decimal',
            precision: 16,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'ema_50_slope',
            type: 'enum',
            enum: ['1', '-1'],
            isNullable: true,
          },
          {
            name: 'is_pump',
            type: 'tinyint',
            isNullable: true,
            default: 0,
          },
          {
            name: 'is_dump',
            type: 'tinyint',
            isNullable: true,
            default: 0,
          },
          {
            name: 'volume_trend',
            type: 'enum',
            enum: ['1', '-1'],
            isNullable: true,
          },
        ],
        indices: [
          new TableIndex({ columnNames: ['symbol', 'open_time'] }),
          new TableIndex({ columnNames: ['symbol', 'interval', 'open_time'] }),
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(tableName);
  }
}
