import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

const tableName = 'markets';

export class migration1655954877886 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: tableName,
        columns: [
          {
            name: 'id',
            type: 'int',
            isGenerated: true,
            generationStrategy: 'increment',
            isPrimary: true,
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'base_asset',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'quote_asset',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'price_tick_size',
            type: 'decimal',
            precision: 10,
            scale: 8,
            isNullable: false,
          },
          {
            name: 'step_size',
            type: 'decimal',
            precision: 10,
            scale: 8,
            isNullable: false,
          },
          { name: 'symbol', type: 'varchar', length: '32', isNullable: false },
          {
            name: 'last_price',
            type: 'decimal',
            precision: 16,
            scale: 8,
            default: 0,
          },
          {
            name: 'trader_lock',
            type: 'tinyint',
            default: 0,
          },
          {
            name: 'last_trader_lock_update',
            type: 'int',
            default: 0,
          },
          { name: 'enabled', type: 'tinyint', isNullable: false, default: 0 },
          {
            name: 'use_test_account',
            type: 'tinyint',
            isNullable: false,
            default: 1,
          },
        ],
        indices: [
          new TableIndex({
            columnNames: ['symbol'],
            isUnique: true,
          }),
          new TableIndex({
            columnNames: ['trader_lock', 'last_trader_lock_update'],
          }),
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(tableName);
  }
}
