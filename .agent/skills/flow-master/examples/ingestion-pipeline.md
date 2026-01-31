# Ejemplo: Pipeline de Ingesta Completo para NeuralTrade

Este ejemplo demuestra cómo Flow Master diseña e implementa el pipeline de ingesta de datos de mercado para NeuralTrade.

---

## 📋 Objetivo

Construir un pipeline que:
1. Ingiere datos de múltiples exchanges en tiempo real
2. Procesa y enriquece los datos en streaming
3. Distribuye a consumidores via RabbitMQ
4. Persiste en InfluxDB con batching optimizado
5. Maneja backpressure y fallos gracefully

---

## 1. 🏗️ Arquitectura del Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PIPELINE DE INGESTA NEURALTRADE                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        EXCHANGE ADAPTERS                        │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │   │
│  │  │ Binance  │  │ Coinbase │  │  Kraken  │  │   Bybit  │       │   │
│  │  │ Adapter  │  │ Adapter  │  │ Adapter  │  │ Adapter  │       │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │   │
│  └───────┼─────────────┼─────────────┼─────────────┼──────────────┘   │
│          │             │             │             │                   │
│          └─────────────┴──────┬──────┴─────────────┘                   │
│                               │                                        │
│                               ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      STREAM PROCESSOR                           │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│  │  │   Enricher   │→ │  Aggregator  │→ │   Validator  │          │   │
│  │  │  (mid/spread)│  │  (OHLCV 1m)  │  │  (schema)    │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │   │
│  └───────────────────────────┬─────────────────────────────────────┘   │
│                              │                                         │
│          ┌───────────────────┴───────────────────┐                    │
│          │                                       │                    │
│          ▼                                       ▼                    │
│  ┌───────────────┐                      ┌───────────────┐            │
│  │   RabbitMQ    │                      │   InfluxDB    │            │
│  │   Publisher   │                      │   Writer      │            │
│  │               │                      │   (Batch)     │            │
│  └───────┬───────┘                      └───────────────┘            │
│          │                                                            │
│          ├─────────────┬─────────────┬─────────────┐                 │
│          │             │             │             │                  │
│          ▼             ▼             ▼             ▼                  │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐            │
│  │ Dashboard │ │ ML Engine │ │ Backtester│ │  Signals  │            │
│  │ WebSocket │ │ Consumer  │ │ Consumer  │ │ Consumer  │            │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘            │
│                                                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 🔌 Exchange Adapter Pattern

```typescript
// services/ingestion/src/adapters/base.adapter.ts

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { Logger } from 'pino';

export interface RawTick {
  exchange: string;
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  timestamp: number;
}

export interface ExchangeConfig {
  name: string;
  wsUrl: string;
  symbols: string[];
  reconnectDelayMs: number;
  heartbeatIntervalMs: number;
}

/**
 * Base adapter for exchange WebSocket connections
 */
export abstract class BaseExchangeAdapter extends EventEmitter {
  protected ws: WebSocket | null = null;
  protected isConnected = false;
  protected reconnectAttempts = 0;
  protected heartbeatTimer: NodeJS.Timeout | null = null;
  
  constructor(
    protected config: ExchangeConfig,
    protected logger: Logger,
  ) {
    super();
  }
  
  /**
   * Connect to exchange WebSocket
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logger.info({ exchange: this.config.name }, 'Connecting to exchange');
      
      this.ws = new WebSocket(this.config.wsUrl);
      
      this.ws.on('open', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.logger.info({ exchange: this.config.name }, 'Connected');
        
        // Subscribe to symbols
        this.subscribe(this.config.symbols);
        
        // Start heartbeat
        this.startHeartbeat();
        
        resolve();
      });
      
      this.ws.on('message', (data) => {
        try {
          const parsed = this.parseMessage(data);
          if (parsed) {
            this.emit('tick', parsed);
          }
        } catch (error) {
          this.logger.error({ error }, 'Failed to parse message');
        }
      });
      
      this.ws.on('close', (code, reason) => {
        this.isConnected = false;
        this.stopHeartbeat();
        this.logger.warn({ code, reason: reason.toString() }, 'Disconnected');
        this.scheduleReconnect();
      });
      
      this.ws.on('error', (error) => {
        this.logger.error({ error }, 'WebSocket error');
        if (!this.isConnected) {
          reject(error);
        }
      });
    });
  }
  
  /**
   * Subscribe to symbols - implemented by subclass
   */
  protected abstract subscribe(symbols: string[]): void;
  
  /**
   * Parse incoming message - implemented by subclass
   */
  protected abstract parseMessage(data: WebSocket.RawData): RawTick | null;
  
  /**
   * Send heartbeat - implemented by subclass
   */
  protected abstract sendHeartbeat(): void;
  
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatIntervalMs);
  }
  
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
  
  private scheduleReconnect(): void {
    const delay = this.config.reconnectDelayMs * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;
    
    this.logger.info({ delay, attempt: this.reconnectAttempts }, 'Scheduling reconnect');
    
    setTimeout(() => {
      this.connect().catch((error) => {
        this.logger.error({ error }, 'Reconnection failed');
      });
    }, delay);
  }
  
  /**
   * Disconnect from exchange
   */
  async disconnect(): Promise<void> {
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = null;
    this.isConnected = false;
  }
  
  /**
   * Pause receiving (for backpressure)
   */
  pause(): void {
    this.ws?.pause();
    this.logger.info({ exchange: this.config.name }, 'Paused');
  }
  
  /**
   * Resume receiving
   */
  resume(): void {
    this.ws?.resume();
    this.logger.info({ exchange: this.config.name }, 'Resumed');
  }
}
```

```typescript
// services/ingestion/src/adapters/binance.adapter.ts

import { BaseExchangeAdapter, RawTick, ExchangeConfig } from './base.adapter';
import { Logger } from 'pino';

interface BinanceTradeMessage {
  e: 'trade';           // Event type
  E: number;            // Event time
  s: string;            // Symbol
  p: string;            // Price
  q: string;            // Quantity
  b: number;            // Buyer order ID
  a: number;            // Seller order ID
  T: number;            // Trade time
  m: boolean;           // Is buyer maker
}

interface BinanceBookTickerMessage {
  u: number;            // Update ID
  s: string;            // Symbol
  b: string;            // Best bid price
  B: string;            // Best bid qty
  a: string;            // Best ask price
  A: string;            // Best ask qty
}

export class BinanceAdapter extends BaseExchangeAdapter {
  private bookTickers = new Map<string, { bid: number; ask: number }>();
  
  constructor(symbols: string[], logger: Logger) {
    super({
      name: 'binance',
      wsUrl: 'wss://stream.binance.com:9443/ws',
      symbols,
      reconnectDelayMs: 1000,
      heartbeatIntervalMs: 30000,
    }, logger);
  }
  
  protected subscribe(symbols: string[]): void {
    const streams = symbols.flatMap((symbol) => {
      const binanceSymbol = symbol.replace('/', '').toLowerCase();
      return [
        `${binanceSymbol}@trade`,
        `${binanceSymbol}@bookTicker`,
      ];
    });
    
    const subscribeMsg = {
      method: 'SUBSCRIBE',
      params: streams,
      id: 1,
    };
    
    this.ws?.send(JSON.stringify(subscribeMsg));
    this.logger.info({ symbols: symbols.length }, 'Subscribed to streams');
  }
  
  protected parseMessage(data: WebSocket.RawData): RawTick | null {
    const msg = JSON.parse(data.toString());
    
    // Handle book ticker updates
    if (msg.u && msg.b && msg.a) {
      const bookTicker = msg as BinanceBookTickerMessage;
      this.bookTickers.set(bookTicker.s, {
        bid: parseFloat(bookTicker.b),
        ask: parseFloat(bookTicker.a),
      });
      return null; // Don't emit, just update cache
    }
    
    // Handle trade events
    if (msg.e === 'trade') {
      const trade = msg as BinanceTradeMessage;
      const symbol = this.formatSymbol(trade.s);
      const book = this.bookTickers.get(trade.s) || { bid: 0, ask: 0 };
      
      return {
        exchange: 'binance',
        symbol,
        bid: book.bid || parseFloat(trade.p),
        ask: book.ask || parseFloat(trade.p),
        last: parseFloat(trade.p),
        volume: parseFloat(trade.q),
        timestamp: trade.T,
      };
    }
    
    return null;
  }
  
  protected sendHeartbeat(): void {
    // Binance doesn't require explicit heartbeat
    // Just check connection health
    if (this.ws?.readyState !== 1) {
      this.logger.warn('WebSocket not in OPEN state');
    }
  }
  
  private formatSymbol(binanceSymbol: string): string {
    // BTCUSDT -> BTC/USDT
    const quote = ['USDT', 'BUSD', 'USDC', 'BTC', 'ETH'].find((q) =>
      binanceSymbol.endsWith(q)
    );
    if (quote) {
      const base = binanceSymbol.slice(0, -quote.length);
      return `${base}/${quote}`;
    }
    return binanceSymbol;
  }
}
```

---

## 3. 📨 RabbitMQ Publisher con Confirmaciones

```typescript
// services/ingestion/src/queue/publisher.ts

import { Channel, ConfirmChannel, Connection, Options } from 'amqplib';
import { Logger } from 'pino';
import { pipelineMetrics } from '../metrics';

interface PublishOptions {
  persistent?: boolean;
  priority?: number;
  expiration?: string;
  messageId?: string;
}

/**
 * Publisher con confirmaciones y batching
 */
export class RabbitMQPublisher {
  private channel: ConfirmChannel | null = null;
  private pendingConfirms = new Map<number, { resolve: () => void; reject: (err: Error) => void }>();
  private deliveryTag = 0;
  
  constructor(
    private connection: Connection,
    private logger: Logger,
  ) {}
  
  async initialize(): Promise<void> {
    // Usar canal con confirmaciones
    this.channel = await this.connection.createConfirmChannel();
    
    // Manejar confirmaciones
    this.channel.on('return', (msg) => {
      this.logger.warn(
        { routingKey: msg.fields.routingKey },
        'Message returned - no queue bound'
      );
    });
    
    this.logger.info('Publisher initialized with confirms');
  }
  
  /**
   * Publica mensaje con confirmación
   */
  async publish<T>(
    exchange: string,
    routingKey: string,
    data: T,
    options: PublishOptions = {},
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }
    
    const content = Buffer.from(JSON.stringify(data));
    
    const publishOptions: Options.Publish = {
      persistent: options.persistent ?? true,
      priority: options.priority,
      expiration: options.expiration,
      messageId: options.messageId || this.generateMessageId(),
      timestamp: Date.now(),
      contentType: 'application/json',
    };
    
    return new Promise((resolve, reject) => {
      const tag = ++this.deliveryTag;
      this.pendingConfirms.set(tag, { resolve, reject });
      
      const success = this.channel!.publish(
        exchange,
        routingKey,
        content,
        publishOptions,
        (err) => {
          this.pendingConfirms.delete(tag);
          if (err) {
            pipelineMetrics.messagesNacked.labels(exchange, 'publish_error').inc();
            reject(err);
          } else {
            pipelineMetrics.messagesPublished.labels(exchange, routingKey).inc();
            resolve();
          }
        }
      );
      
      if (!success) {
        // Buffer lleno - backpressure
        this.pendingConfirms.delete(tag);
        reject(new Error('Channel buffer full'));
      }
    });
  }
  
  /**
   * Publica batch de mensajes
   */
  async publishBatch<T>(
    exchange: string,
    messages: Array<{ routingKey: string; data: T; options?: PublishOptions }>,
  ): Promise<void> {
    const promises = messages.map((msg) =>
      this.publish(exchange, msg.routingKey, msg.data, msg.options)
    );
    
    await Promise.all(promises);
    pipelineMetrics.batchSize.labels('publish').observe(messages.length);
  }
  
  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  async close(): Promise<void> {
    await this.channel?.waitForConfirms();
    await this.channel?.close();
    this.logger.info('Publisher closed');
  }
}
```

---

## 4. 📊 InfluxDB Writer con Batching

```typescript
// services/ingestion/src/streams/influx.writer.ts

import { InfluxDB, Point, WriteApi, WritePrecision } from '@influxdata/influxdb-client';
import { Logger } from 'pino';
import { pipelineMetrics } from '../metrics';

interface InfluxConfig {
  url: string;
  token: string;
  org: string;
  bucket: string;
  batchSize: number;
  flushInterval: number;
  maxRetries: number;
}

interface ProcessedTick {
  exchange: string;
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  mid: number;
  spread: number;
  spreadBps: number;
  volume: number;
  timestamp: number;
}

interface AggregatedOHLCV {
  exchange: string;
  symbol: string;
  timeframe: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trades: number;
  vwap: number;
  timestamp: number;
}

/**
 * InfluxDB writer optimizado para alto throughput
 */
export class InfluxDBWriter {
  private client: InfluxDB;
  private writeApi: WriteApi;
  private buffer: Point[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  
  constructor(
    private config: InfluxConfig,
    private logger: Logger,
  ) {
    this.client = new InfluxDB({
      url: config.url,
      token: config.token,
    });
    
    this.writeApi = this.client.getWriteApi(
      config.org,
      config.bucket,
      WritePrecision.ms,
      {
        batchSize: config.batchSize,
        flushInterval: config.flushInterval,
        maxRetries: config.maxRetries,
        retryJitter: 200,
        maxRetryDelay: 15000,
        writeFailed: (error, lines, attempt) => {
          this.logger.error(
            { error: error.message, lines: lines.length, attempt },
            'InfluxDB write failed'
          );
          pipelineMetrics.messagesFailed.labels('influx', error.name).inc(lines.length);
        },
        writeSuccess: (lines) => {
          pipelineMetrics.batchSize.labels('influx_write').observe(lines.length);
        },
      }
    );
    
    // Default tags
    this.writeApi.useDefaultTags({ service: 'ingestion' });
    
    this.logger.info('InfluxDB writer initialized');
  }
  
  /**
   * Escribe un tick procesado
   */
  writeTick(tick: ProcessedTick): void {
    const point = new Point('market_ticks')
      .tag('exchange', tick.exchange)
      .tag('symbol', tick.symbol.replace('/', '_'))
      .floatField('bid', tick.bid)
      .floatField('ask', tick.ask)
      .floatField('last', tick.last)
      .floatField('mid', tick.mid)
      .floatField('spread', tick.spread)
      .floatField('spread_bps', tick.spreadBps)
      .floatField('volume', tick.volume)
      .timestamp(tick.timestamp);
    
    this.writeApi.writePoint(point);
  }
  
  /**
   * Escribe batch de ticks
   */
  writeTicks(ticks: ProcessedTick[]): void {
    for (const tick of ticks) {
      this.writeTick(tick);
    }
    this.logger.debug({ count: ticks.length }, 'Wrote ticks batch');
  }
  
  /**
   * Escribe OHLCV agregado
   */
  writeOHLCV(ohlcv: AggregatedOHLCV): void {
    const point = new Point('market_ohlcv')
      .tag('exchange', ohlcv.exchange)
      .tag('symbol', ohlcv.symbol.replace('/', '_'))
      .tag('timeframe', ohlcv.timeframe)
      .floatField('open', ohlcv.open)
      .floatField('high', ohlcv.high)
      .floatField('low', ohlcv.low)
      .floatField('close', ohlcv.close)
      .floatField('volume', ohlcv.volume)
      .intField('trades', ohlcv.trades)
      .floatField('vwap', ohlcv.vwap)
      .timestamp(ohlcv.timestamp);
    
    this.writeApi.writePoint(point);
  }
  
  /**
   * Escribe señal de ML
   */
  writeSignal(signal: {
    exchange: string;
    symbol: string;
    signalType: 'buy' | 'hold' | 'sell';
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    probBuy: number;
    probHold: number;
    probSell: number;
    riskScore: number;
    inferenceTimeMs: number;
    modelVersion: string;
    timestamp: number;
  }): void {
    const point = new Point('ml_signals')
      .tag('exchange', signal.exchange)
      .tag('symbol', signal.symbol.replace('/', '_'))
      .tag('signal', signal.signalType)
      .tag('risk_level', signal.riskLevel)
      .floatField('confidence', signal.confidence)
      .floatField('prob_buy', signal.probBuy)
      .floatField('prob_hold', signal.probHold)
      .floatField('prob_sell', signal.probSell)
      .floatField('risk_score', signal.riskScore)
      .floatField('inference_time_ms', signal.inferenceTimeMs)
      .stringField('model_version', signal.modelVersion)
      .timestamp(signal.timestamp);
    
    this.writeApi.writePoint(point);
  }
  
  /**
   * Flush manual
   */
  async flush(): Promise<void> {
    await this.writeApi.flush();
    this.logger.debug('Flushed InfluxDB buffer');
  }
  
  /**
   * Cierra la conexión
   */
  async close(): Promise<void> {
    await this.writeApi.close();
    this.logger.info('InfluxDB writer closed');
  }
}
```

---

## 5. 🔧 Orquestación del Pipeline

```typescript
// services/ingestion/src/main.ts

import { Logger } from 'pino';
import { createLogger } from '@neuraltrade/logging';
import { BinanceAdapter } from './adapters/binance.adapter';
import { CoinbaseAdapter } from './adapters/coinbase.adapter';
import { RabbitMQCluster } from './queue/cluster';
import { RabbitMQPublisher } from './queue/publisher';
import { InfluxDBWriter } from './streams/influx.writer';
import { PriceStreamProcessor } from './streams/price.stream';
import { FlowController, BackpressureBuffer } from './backpressure';
import { pipelineMetrics } from './metrics';
import { setupTopology } from './queue/topology';
import { config } from './config';

async function main(): Promise<void> {
  const logger = createLogger({ name: 'ingestion' });
  
  logger.info('Starting NeuralTrade Ingestion Service...');
  
  // 1. Conectar a RabbitMQ
  const rabbit = new RabbitMQCluster({
    nodes: config.rabbitmq.nodes,
    heartbeat: 60,
    connectionTimeout: 10000,
    reconnectDelay: 1000,
    maxReconnectAttempts: 10,
  }, logger);
  
  await rabbit.connect();
  await setupTopology(rabbit.getChannel());
  
  const publisher = new RabbitMQPublisher(rabbit.connection, logger);
  await publisher.initialize();
  
  // 2. Conectar a InfluxDB
  const influx = new InfluxDBWriter({
    url: config.influxdb.url,
    token: config.influxdb.token,
    org: config.influxdb.org,
    bucket: config.influxdb.bucket,
    batchSize: 5000,
    flushInterval: 1000,
    maxRetries: 3,
  }, logger);
  
  // 3. Crear stream processor
  const processor = new PriceStreamProcessor(influx, publisher, logger, {
    batchSize: 1000,
    flushIntervalMs: 500,
    aggregationIntervals: ['1m', '5m', '15m', '1h'],
  });
  
  processor.start();
  
  // 4. Crear backpressure buffer
  const buffer = new BackpressureBuffer<RawTick>(
    (batch) => Promise.all(batch.map((tick) => processor.processTick(tick))).then(() => {}),
    {
      batchSize: 100,
      maxBufferSize: 50000,
      flushIntervalMs: 100,
    },
    logger,
  );
  
  // 5. Crear adapters de exchange
  const adapters = [
    new BinanceAdapter(config.symbols.binance, logger),
    // new CoinbaseAdapter(config.symbols.coinbase, logger),
    // new KrakenAdapter(config.symbols.kraken, logger),
  ];
  
  // 6. Manejar backpressure
  buffer.onBackpressure((paused) => {
    if (paused) {
      logger.warn('Backpressure: pausing all adapters');
      adapters.forEach((adapter) => adapter.pause());
      pipelineMetrics.connectionStatus.labels('ingestion').set(0.5);
    } else {
      logger.info('Backpressure: resuming all adapters');
      adapters.forEach((adapter) => adapter.resume());
      pipelineMetrics.connectionStatus.labels('ingestion').set(1);
    }
  });
  
  // 7. Conectar todos los adapters
  for (const adapter of adapters) {
    adapter.on('tick', (tick) => {
      const accepted = buffer.push(tick);
      if (!accepted) {
        pipelineMetrics.messagesNacked.labels('ingestion', 'backpressure').inc();
      }
    });
    
    await adapter.connect();
    pipelineMetrics.connectionStatus.labels(adapter.constructor.name).set(1);
  }
  
  logger.info(
    { adapters: adapters.length, symbols: config.symbols.binance.length },
    'Ingestion service started'
  );
  
  // 8. Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    
    // Stop adapters
    await Promise.all(adapters.map((a) => a.disconnect()));
    
    // Stop processor
    processor.stop();
    
    // Flush remaining data
    await influx.flush();
    await influx.close();
    
    // Close RabbitMQ
    await publisher.close();
    await rabbit.close();
    
    logger.info('Shutdown complete');
    process.exit(0);
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

---

## 6. 📈 Queries de InfluxDB (Flux)

```flux
// queries/last_prices.flux
// Obtener últimos precios para dashboard

from(bucket: "market_data")
  |> range(start: -1m)
  |> filter(fn: (r) => r._measurement == "market_ticks")
  |> filter(fn: (r) => r.exchange == "binance")
  |> last()
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> keep(columns: ["symbol", "last", "bid", "ask", "spread_bps", "volume"])
```

```flux
// queries/ohlcv_for_chart.flux
// Datos OHLCV para gráfica (últimas 200 velas de 15m)

from(bucket: "market_data")
  |> range(start: -50h)  // 200 velas × 15min = 50h
  |> filter(fn: (r) => r._measurement == "market_ohlcv")
  |> filter(fn: (r) => r.symbol == "BTC_USDT")
  |> filter(fn: (r) => r.timeframe == "15m")
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> keep(columns: ["_time", "open", "high", "low", "close", "volume", "vwap"])
  |> sort(columns: ["_time"])
  |> limit(n: 200)
```

```flux
// queries/signal_performance.flux
// Análisis de performance de señales por modelo

from(bucket: "market_data")
  |> range(start: -7d)
  |> filter(fn: (r) => r._measurement == "ml_signals")
  |> filter(fn: (r) => r.signal != "hold")
  |> group(columns: ["model_version", "signal"])
  |> aggregateWindow(every: 1d, fn: count, createEmpty: false)
  |> pivot(rowKey:["_time"], columnKey: ["signal"], valueColumn: "_value")
  |> map(fn: (r) => ({
      r with
      total: (r.buy + r.sell),
      buy_ratio: float(v: r.buy) / float(v: r.buy + r.sell)
    }))
```

---

## ✅ Checklist de Implementación

```yaml
Exchange Adapters:
  ✅ Patrón base con métodos abstractos
  ✅ Reconexión automática con backoff
  ✅ Heartbeat para mantener conexión
  ✅ Pause/Resume para backpressure

Stream Processing:
  ✅ Enrichment de datos (mid, spread)
  ✅ Agregación OHLCV multi-timeframe
  ✅ Batching para InfluxDB

RabbitMQ:
  ✅ Publisher confirms habilitados
  ✅ Topología con DLX
  ✅ Cluster support
  ✅ Métricas de publish

InfluxDB:
  ✅ Batching optimizado
  ✅ Retry con backoff
  ✅ Schema con baja cardinalidad
  ✅ Queries optimizadas

Backpressure:
  ✅ Flow controller
  ✅ Buffer con límites
  ✅ Pause/Resume de adapters
  ✅ Métricas de dropped messages

Observability:
  ✅ Métricas Prometheus
  ✅ Logging estructurado
  ✅ Health checks
  ✅ Graceful shutdown
```

---

*Este ejemplo demuestra el enfoque completo de Flow Master para pipelines de datos en tiempo real.*
