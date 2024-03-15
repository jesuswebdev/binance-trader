import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

type GetBinanceInstanceProps = {
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
};

const secureEndpoints = [
  '/api/v3/order',
  '/api/v3/allOrders',
  '/api/v3/account',
  '/sapi/v1/asset/dust',
  '/sapi/v1/capital/withdraw/apply',
  '/sapi/v1/capital/withdraw/history',
  '/sapi/v1/asset/assetDetail',
] as const;

function getSignature(query: string, apiSecret: string) {
  return crypto.createHmac('sha256', apiSecret).update(query).digest('hex');
}

const getBinanceInstance = ({
  apiUrl,
  apiKey,
  apiSecret,
}: GetBinanceInstanceProps): AxiosInstance => {
  if (!apiUrl) {
    throw new Error('Binance API URL is not defined');
  }

  if (!apiKey) {
    throw new Error('Binance API Key is not defined');
  }

  if (!apiSecret) {
    throw new Error('Binance API Secret is not defined');
  }

  const binance = axios.create({
    baseURL: apiUrl,
    headers: { 'X-MBX-APIKEY': apiKey },
  });

  binance.interceptors.request.use(
    (config) => {
      const [base, query] = (config.url ?? '').split('?');
      const timestamp = Date.now();
      const requiresSignature = secureEndpoints.some(
        (endpoint) => endpoint === base,
      );

      if (requiresSignature) {
        const newQuery = `timestamp=${timestamp}&recvWindow=15000${query ? `&${query}` : ''}`;
        config.url = `${base}?${newQuery}&signature=${getSignature(newQuery, apiSecret)}`;
      }

      return config;
    },
    (error) => {
      Promise.reject(error);
    },
  );

  return binance;
};

export default getBinanceInstance;
