import { DataSource } from 'typeorm';

declare module '@hapi/hapi' {
  export interface PluginProperties {
    // eslint-disable-next-line
    [key: string]: any;
    typeorm: {
      connection: DataSource;
    };
  }
}
