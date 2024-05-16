import { render } from 'preact';
import { memo } from 'preact/compat';
import { useEffect, useState, useMemo } from 'preact/hooks';
import 'whatwg-fetch';
import './style.css';
import { format, formatDistance, subMinutes, isAfter } from 'date-fns';

const API_URL = 'http://209.38.204.56/api/v1/stats';
const API_TOKEN =
  '6b79d72f5316d31586c60aa3e9da0271cc56c2566ca84e63d44ca28160dc6f0d';

type CandleData = {
  above_ema: boolean;
  di: boolean;
  green_candles: boolean;
  last_candle_update: string;
  last_market_price: number;
  last_market_update: string;
  mesa: boolean;
  symbol: string;
  trend: boolean;
  upward_slope: boolean;
  volatility: boolean;
  volume: boolean;
};

export function App() {
  const [firstPageLoad, setFirstPageLoad] = useState(true);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [intervalCount, setIntervalCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    setHasError(false);

    fetch(API_URL, { headers: { 'X-API-KEY': API_TOKEN } })
      .then(async (res) => {
        if (res.status >= 400) {
          setHasError(true);
        }

        if (res.status === 200) {
          const data = await res.json();
          setStats(data);
        }

        setLoading(false);
        setFirstPageLoad(false);
      })
      .catch((error) => {
        console.error(error);
        setLoading(false);
        setHasError(true);
      });
  }, [intervalCount]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIntervalCount((count) => count + 1);
    }, 3e4);

    return () => {
      clearInterval(interval);
    };
  }, []);

  if (loading && !hasError && firstPageLoad) {
    return <h3>Loading...</h3>;
  }

  if (!loading && hasError) {
    return <h3>There was an error fetching the stats</h3>;
  }

  return (
    <div class="flex four">
      {stats.map((stat) => (
        <Card {...stat} key={stat.symbol} />
      ))}
    </div>
  );
}

const Card = memo(
  function Card(props: CandleData) {
    return (
      <article
        class="card"
        style={{
          margin: '0.5em',
          width: '300px',
        }}
      >
        <header>
          <h3>
            <a
              href={`https://www.tradingview.com/chart/?symbol=BINANCE%3A${props.symbol}`}
              target="_blank"
            >
              {props.symbol}
            </a>
          </h3>
        </header>
        <footer>
          <p title={format(props.last_candle_update, 'yyyy-MM-dd HH:mm:ss')}>
            Health:{' '}
            {formatDistance(props.last_candle_update, new Date(), {
              includeSeconds: true,
            })}{' '}
            <Dot
              value={isAfter(
                props.last_candle_update,
                subMinutes(new Date(), 5),
              )}
            />
          </p>
          <p>Last Price: {props.last_market_price}</p>
          <p>
            Volatility:
            <Dot value={props.volatility} />
          </p>
          <p>
            Volume: <Dot value={props.volume} />
          </p>
          <p>
            Upward Slope: <Dot value={props.upward_slope} />
          </p>
          <p>
            Trend: <Dot value={props.trend} />
          </p>
          <p>
            Mesa: <Dot value={props.mesa} />
          </p>
          <p>
            Green Candles: <Dot value={props.green_candles} />
          </p>
          <p>
            ADX: <Dot value={props.di} />
          </p>
          <p>
            Above EMA: <Dot value={props.above_ema} />
          </p>
        </footer>
      </article>
    );
  },
  (prevProps, nextProps) =>
    prevProps.last_candle_update === nextProps.last_candle_update,
);

function Dot({ value }) {
  return (
    <span
      style={{
        height: '16px',
        width: '16px',
        borderRadius: '50%',
        display: 'inline-block',
        verticalAlign: 'middle',
        backgroundColor: value ? '#00ff00' : '#ff0000',
      }}
    />
  );
}

render(<App />, document.getElementById('app'));
