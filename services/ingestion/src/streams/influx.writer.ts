/**
 * InfluxDB Writer for Time-Series Data
 * Persists OHLCV and ticker data for backtesting
 */

import { InfluxDB, Point, WriteApi } from '@influxdata/influxdb-client';
import type { Ticker, OHLCV, Exchange, Symbol } from '@neuraltrade/shared-types';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export class TimeSeriesWriter {
    private client: InfluxDB;
    private writeApi: WriteApi;
    private readonly log = logger.child({ component: 'TimeSeriesWriter' });

    constructor() {
        this.client = new InfluxDB({
            url: env.INFLUXDB_URL,
            token: env.INFLUXDB_TOKEN,
        });

        this.writeApi = this.client.getWriteApi(env.INFLUXDB_ORG, env.INFLUXDB_BUCKET, 'ms');

        // Handle write errors
        this.writeApi.useDefaultTags({ service: 'ingestion' });
    }

    /**
     * Write ticker data point
     */
    writeTicker(ticker: Ticker): void {
        const point = new Point('ticker')
            .tag('exchange', ticker.exchange)
            .tag('symbol', ticker.symbol.replace('/', '_'))
            .floatField('bid', ticker.bid)
            .floatField('ask', ticker.ask)
            .floatField('last', ticker.last)
            .floatField('volume24h', ticker.volume24h)
            .floatField('spread', ticker.ask - ticker.bid)
            .timestamp(ticker.timestamp);

        this.writeApi.writePoint(point);
        this.log.trace({ exchange: ticker.exchange, symbol: ticker.symbol }, 'Ticker written');
    }

    /**
     * Write OHLCV candle
     */
    writeOHLCV(exchange: Exchange, symbol: Symbol, timeframe: string, candle: OHLCV): void {
        const point = new Point('ohlcv')
            .tag('exchange', exchange)
            .tag('symbol', symbol.replace('/', '_'))
            .tag('timeframe', timeframe)
            .floatField('open', candle.open)
            .floatField('high', candle.high)
            .floatField('low', candle.low)
            .floatField('close', candle.close)
            .floatField('volume', candle.volume)
            .floatField('range', candle.high - candle.low)
            .timestamp(candle.timestamp);

        this.writeApi.writePoint(point);
    }

    /**
     * Batch write OHLCV candles
     */
    writeOHLCVBatch(exchange: Exchange, symbol: Symbol, timeframe: string, candles: OHLCV[]): void {
        for (const candle of candles) {
            this.writeOHLCV(exchange, symbol, timeframe, candle);
        }

        this.log.debug({
            exchange,
            symbol,
            timeframe,
            count: candles.length
        }, 'OHLCV batch written');
    }

    /**
     * Flush pending writes
     */
    async flush(): Promise<void> {
        await this.writeApi.flush();
        this.log.debug('Write buffer flushed');
    }

    /**
     * Close the writer
     */
    async close(): Promise<void> {
        await this.writeApi.close();
        this.log.info('InfluxDB writer closed');
    }
}
