import { Module } from '@nestjs/common';
import { resolve } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ENVIRONMENT_TYPES } from '@binance-trader/shared';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { Account, AccountSchema } from './account/account.schema';
import { Market, MarketSchema } from './market/market.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: resolve(
        __dirname,
        `../.env.${process.env.NODE_ENV ?? ENVIRONMENT_TYPES.DEVELOPMENT}`,
      ),
    }),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: `${configService.get('DATABASE_PROTOCOL')}://${configService.get('DATABASE_USERNAME')}:${configService.get('DATABASE_PASSWORD')}@${configService.get('DATABASE_HOST')}/${configService.get('DATABASE_NAME')}`,
        authSource: 'admin',
      }),
    }),
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: Market.name, schema: MarketSchema },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
