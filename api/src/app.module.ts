import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { resolve } from 'path';
import { MongooseModule } from '@nestjs/mongoose';
import { ENVIRONMENT_TYPES } from '@binance-trader/shared';
import { Market, MarketSchema } from './market/market.schema';
import { Candle, CandleSchema } from './candle/candle.schema';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: resolve(
        __dirname,
        `../.env.${process.env.NODE_ENV ?? ENVIRONMENT_TYPES.DEVELOPMENT}`,
      ),
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: `${configService.get('DATABASE_PROTOCOL')}://${configService.get('DATABASE_USERNAME')}:${configService.get('DATABASE_PASSWORD')}@${configService.get('DATABASE_HOST')}/${configService.get('DATABASE_NAME')}`,
        authSource: 'admin',
        minPoolSize: 1,
        maxPoolSize: 3,
      }),
    }),
    MongooseModule.forFeature([
      { name: Market.name, schema: MarketSchema },
      { name: Candle.name, schema: CandleSchema },
    ]),
    ThrottlerModule.forRoot([
      {
        ttl: 30000,
        limit: 5,
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
