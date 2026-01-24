/**
 * Historical Data Loader
 * Fetches OHLCV data from InfluxDB for backtesting
 */

import { InfluxDB, FluxTableMetaData } from '@influxdata/influxdb-client';
import type { OHLCV, Exchange, Symbol, Timeframe } from '@neuraltrade/shared-types';
import pino from 'pino';

const log = pino({ name: 'historical-loader' });

interface InfluxConfig {
    url: string;
    token: string;
    org: string;
    bucket: string;
}

export class HistoricalDataLoader {
    private client: InfluxDB;
    private queryApi: ReturnType<InfluxDB['getQueryApi']>;
    private bucket: string;

    constructor(config: InfluxConfig) {
        this.client = new InfluxDB({
            url: config.url,
            token: config.token,
        });
        this.queryApi = this.client.getQueryApi(config.org);
        this.bucket = config.bucket;
    }

    /**
     * Load historical OHLCV data for backtesting
     */
    async loadOHLCV(params: {
        exchange: Exchange;
        symbol: Symbol;
        timeframe: Timeframe;
        startDate: Date;
        endDate: Date;
    }): Promise<OHLCV[]> {
        const { exchange, symbol, timeframe, startDate, endDate } = params;
        const symbolTag = symbol.replace('/', '_');

        const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${startDate.toISOString()}, stop: ${endDate.toISOString()})
        |> filter(fn: (r) => r._measurement == "ohlcv")
        |> filter(fn: (r) => r.exchange == "${exchange}")
        |> filter(fn: (r) => r.symbol == "${symbolTag}")
        |> filter(fn: (r) => r.timeframe == "${timeframe}")
        |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> sort(columns: ["_time"])
    `;

        const candles: OHLCV[] = [];

        return new Promise((resolve, reject) => {
            this.queryApi.queryRows(query, {
                next: (row: string[], tableMeta: FluxTableMetaData) => {
                    const o = tableMeta.toObject(row);
                    candles.push({
                        timestamp: new Date(o._time as string).getTime(),
                        open: parseFloat(o.open as string),
                        high: parseFloat(o.high as string),
                        low: parseFloat(o.low as string),
                        close: parseFloat(o.close as string),
                        volume: parseFloat(o.volume as string),
                    });
                },
                error: (error: Error) => {
                    log.error({ error, params }, 'Failed to load historical data');
                    reject(error);
                },
                complete: () => {
                    log.info({
                        exchange,
                        symbol,
                        timeframe,
                        count: candles.length,
                        range: { from: startDate, to: endDate },
                    }, 'Historical data loaded');
                    resolve(candles);
                },
            });
        });
    }

    /**
     * Get available date range for a symbol
     */
    async getDataRange(exchange: Exchange, symbol: Symbol): Promise<{ start: Date; end: Date } | null> {
        const symbolTag = symbol.replace('/', '_');

        const query = `
      from(bucket: "${this.bucket}")
        |> range(start: -5y)
        |> filter(fn: (r) => r._measurement == "ohlcv")
        |> filter(fn: (r) => r.exchange == "${exchange}")
        |> filter(fn: (r) => r.symbol == "${symbolTag}")
        |> first()
        |> keep(columns: ["_time"])
    `;

        const queryLast = `
      from(bucket: "${this.bucket}")
        |> range(start: -5y)
        |> filter(fn: (r) => r._measurement == "ohlcv")
        |> filter(fn: (r) => r.exchange == "${exchange}")
        |> filter(fn: (r) => r.symbol == "${symbolTag}")
        |> last()
        |> keep(columns: ["_time"])
    `;

        let firstTime: Date | null = null;
        let lastTime: Date | null = null;

        return new Promise((resolve, reject) => {
            // Get first timestamp
            this.queryApi.queryRows(query, {
                next: (row: string[], tableMeta: FluxTableMetaData) => {
                    const o = tableMeta.toObject(row);
                    firstTime = new Date(o._time as string);
                },
                error: reject,
                complete: () => {
                    // Get last timestamp
                    this.queryApi.queryRows(queryLast, {
                        next: (row: string[], tableMeta: FluxTableMetaData) => {
                            const o = tableMeta.toObject(row);
                            lastTime = new Date(o._time as string);
                        },
                        error: reject,
                        complete: () => {
                            if (firstTime && lastTime) {
                                resolve({ start: firstTime, end: lastTime });
                            } else {
                                resolve(null);
                            }
                        },
                    });
                },
            });
        });
    }
}
