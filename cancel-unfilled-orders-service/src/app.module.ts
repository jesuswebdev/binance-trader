import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SERVICES } from './utils/constants';
import {
  ENVIRONMENT_TYPES,
  EXCHANGE_TYPES,
  MessageBroker,
} from '@binance-trader/shared';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { resolve } from 'path';
import { getBinanceInstance } from '@binance-trader/shared';
import { Position, PositionSchema } from './position/position.schema';
import { Order, OrderSchema } from './order/order.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
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
      }),
    }),
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Position.name, schema: PositionSchema },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      inject: [ConfigService],
      provide: SERVICES.MESSAGE_BROKER,
      useFactory: async (configService: ConfigService) => {
        const broker = new MessageBroker({
          connectionOptions: {
            protocol: configService.get('MESSAGE_BROKER_PROTOCOL'),
            hostname: configService.get('MESSAGE_BROKER_HOST'),
            username: configService.get('MESSAGE_BROKER_USER'),
            password: configService.get('MESSAGE_BROKER_PASSWORD'),
          },
          exchange: EXCHANGE_TYPES.MAIN,
        });

        await broker.initializeConnection();

        broker.on('error', (error) => {
          console.error(error);
          process.exit(1);
        });

        return broker;
      },
    },
    {
      inject: [ConfigService],
      provide: SERVICES.BINANCE_API,
      useFactory: async (configService: ConfigService) => {
        const binance = getBinanceInstance({
          apiUrl: configService.get('BINANCE_API_URL'),
          apiKey: configService.get('BINANCE_API_KEY'),
          apiSecret: configService.get('BINANCE_API_SECRET'),
        });

        return binance;
      },
    },
  ],
})
export class AppModule {}
