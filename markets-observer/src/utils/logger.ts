import pino from 'pino';

export default pino({
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: ['err.config.headers["X-MBX-APIKEY"]'],
});
