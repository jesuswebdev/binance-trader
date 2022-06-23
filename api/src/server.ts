import Hapi, { Server } from '@hapi/hapi';
import * as config from './config/index';

let server: Server;

async function destroyDatabaseConnections(
  serverInstance: Server,
): Promise<void> {
  await Promise.all([serverInstance?.plugins?.typeorm?.connection?.destroy()]);
}

export async function init() {
  server = Hapi.server({
    host: config.HOST,
    port: config.PORT,
    routes: { cors: true },
  });

  await server.initialize();

  return server;
}

export async function start() {
  await server.start();
  console.log(`Server listening on port ${server.info.port}`);

  return server;
}

process.on('SIGINT', async () => {
  await destroyDatabaseConnections(server);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  await destroyDatabaseConnections(server);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error(error);
  process.exit(1);
});
