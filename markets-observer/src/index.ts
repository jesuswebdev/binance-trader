import 'reflect-metadata';
import { INTERVAL } from './config';
import { AppDataSource } from './config/data-source';
import Market from './entity/symbol/model';
import { Observer } from './observer';

const start = async () => {
  const connection = await AppDataSource.initialize();

  const markets = await connection
    .getRepository(Market)
    .find({ select: ['symbol', 'base_asset', 'quote_asset'] });

  await connection.destroy();

  const observer = new Observer({ markets, interval: INTERVAL });

  observer.init();
};

start();
