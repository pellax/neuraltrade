/**
 * NeuralTrade - RabbitMQ Topology Configuration
 * 
 * Define toda la topología de exchanges, colas, y bindings
 * para el sistema de mensajería de NeuralTrade.
 */

import { Channel, Options } from 'amqplib';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type ExchangeType = 'direct' | 'topic' | 'fanout' | 'headers';

interface ExchangeDefinition {
    name: string;
    type: ExchangeType;
    options: Options.AssertExchange;
    description: string;
}

interface QueueDefinition {
    name: string;
    options: Options.AssertQueue;
    bindings: Array<{
        exchange: string;
        pattern: string;
    }>;
    description: string;
}

interface TopologyConfig {
    exchanges: Record<string, ExchangeDefinition>;
    queues: Record<string, QueueDefinition>;
}

// ═══════════════════════════════════════════════════════════════
// TOPOLOGY DEFINITION
// ═══════════════════════════════════════════════════════════════

export const TOPOLOGY: TopologyConfig = {
    exchanges: {
        // ─────────────────────────────────────────────────────────────
        // MARKET DATA EXCHANGE (Topic)
        // Routing por: {type}.{exchange}.{symbol}
        // Ejemplo: tick.binance.BTC_USDT, ohlcv.coinbase.ETH_USD
        // ─────────────────────────────────────────────────────────────
        market: {
            name: 'neuraltrade.market',
            type: 'topic',
            options: {
                durable: true,
                autoDelete: false,
            },
            description: 'Market data: ticks, OHLCV, order books',
        },

        // ─────────────────────────────────────────────────────────────
        // SIGNALS EXCHANGE (Direct)
        // Routing por: signal.{priority}
        // Ejemplo: signal.high, signal.medium, signal.low
        // ─────────────────────────────────────────────────────────────
        signals: {
            name: 'neuraltrade.signals',
            type: 'direct',
            options: {
                durable: true,
                autoDelete: false,
            },
            description: 'ML signals with priority routing',
        },

        // ─────────────────────────────────────────────────────────────
        // ORDERS EXCHANGE (Direct)
        // Routing por: order.{action}
        // Ejemplo: order.create, order.cancel, order.update
        // ─────────────────────────────────────────────────────────────
        orders: {
            name: 'neuraltrade.orders',
            type: 'direct',
            options: {
                durable: true,
                autoDelete: false,
            },
            description: 'Order management messages',
        },

        // ─────────────────────────────────────────────────────────────
        // NOTIFICATIONS EXCHANGE (Fanout)
        // Broadcast a todos los suscriptores
        // ─────────────────────────────────────────────────────────────
        notifications: {
            name: 'neuraltrade.notifications',
            type: 'fanout',
            options: {
                durable: true,
                autoDelete: false,
            },
            description: 'System-wide notifications (broadcast)',
        },

        // ─────────────────────────────────────────────────────────────
        // DEAD LETTER EXCHANGE
        // Para mensajes que fallaron procesamiento
        // ─────────────────────────────────────────────────────────────
        dlx: {
            name: 'neuraltrade.dlx',
            type: 'direct',
            options: {
                durable: true,
                autoDelete: false,
            },
            description: 'Dead letter exchange for failed messages',
        },

        // ─────────────────────────────────────────────────────────────
        // RETRY EXCHANGE (con delay)
        // Para reintentos con exponential backoff
        // ─────────────────────────────────────────────────────────────
        retry: {
            name: 'neuraltrade.retry',
            type: 'direct',
            options: {
                durable: true,
                autoDelete: false,
            },
            description: 'Retry exchange with TTL queues',
        },
    },

    queues: {
        // ═══════════════════════════════════════════════════════════
        // MARKET DATA QUEUES
        // ═══════════════════════════════════════════════════════════

        // Ticks para escritura a InfluxDB
        ticksInflux: {
            name: 'market.ticks.influx',
            options: {
                durable: true,
                arguments: {
                    'x-dead-letter-exchange': 'neuraltrade.dlx',
                    'x-dead-letter-routing-key': 'market.ticks.dlq',
                    'x-message-ttl': 60000, // 1 minuto
                    'x-max-length': 100000, // Max 100k mensajes
                    'x-overflow': 'reject-publish', // Backpressure
                },
            },
            bindings: [
                { exchange: 'neuraltrade.market', pattern: 'tick.#' },
            ],
            description: 'Ticks for InfluxDB persistence',
        },

        // Ticks para WebSocket broadcast
        ticksWebsocket: {
            name: 'market.ticks.websocket',
            options: {
                durable: false, // Efímero, no necesita persistir
                arguments: {
                    'x-message-ttl': 5000, // 5 segundos
                    'x-max-length': 10000,
                    'x-overflow': 'drop-head', // Descartar viejos
                },
            },
            bindings: [
                { exchange: 'neuraltrade.market', pattern: 'tick.#' },
            ],
            description: 'Ticks for real-time WebSocket broadcast',
        },

        // OHLCV para ML Engine
        ohlcvMl: {
            name: 'market.ohlcv.ml',
            options: {
                durable: true,
                arguments: {
                    'x-dead-letter-exchange': 'neuraltrade.dlx',
                    'x-dead-letter-routing-key': 'market.ohlcv.dlq',
                    'x-message-ttl': 300000, // 5 minutos
                },
            },
            bindings: [
                { exchange: 'neuraltrade.market', pattern: 'ohlcv.*.*.1m' }, // Solo 1m
                { exchange: 'neuraltrade.market', pattern: 'ohlcv.*.*.5m' }, // Solo 5m
            ],
            description: 'OHLCV data for ML Engine consumption',
        },

        // Order books para dashboard
        orderbooks: {
            name: 'market.orderbooks',
            options: {
                durable: false,
                arguments: {
                    'x-message-ttl': 2000, // 2 segundos
                    'x-max-length': 1000,
                    'x-overflow': 'drop-head',
                },
            },
            bindings: [
                { exchange: 'neuraltrade.market', pattern: 'orderbook.#' },
            ],
            description: 'Order book snapshots for dashboard',
        },

        // ═══════════════════════════════════════════════════════════
        // SIGNALS QUEUES
        // ═══════════════════════════════════════════════════════════

        // Señales de alta confianza → Execution
        signalsHighConfidence: {
            name: 'signals.high_confidence',
            options: {
                durable: true,
                arguments: {
                    'x-dead-letter-exchange': 'neuraltrade.dlx',
                    'x-dead-letter-routing-key': 'signals.dlq',
                    'x-max-priority': 10, // Priority queue
                },
            },
            bindings: [
                { exchange: 'neuraltrade.signals', pattern: 'signal.high' },
            ],
            description: 'High confidence signals for execution',
        },

        // Todas las señales → Analytics
        signalsAnalytics: {
            name: 'signals.analytics',
            options: {
                durable: true,
                arguments: {
                    'x-message-ttl': 86400000, // 24 horas
                },
            },
            bindings: [
                { exchange: 'neuraltrade.signals', pattern: 'signal.high' },
                { exchange: 'neuraltrade.signals', pattern: 'signal.medium' },
                { exchange: 'neuraltrade.signals', pattern: 'signal.low' },
            ],
            description: 'All signals for analytics and backtesting',
        },

        // ═══════════════════════════════════════════════════════════
        // ORDER QUEUES
        // ═══════════════════════════════════════════════════════════

        ordersExecution: {
            name: 'orders.execution',
            options: {
                durable: true,
                arguments: {
                    'x-dead-letter-exchange': 'neuraltrade.dlx',
                    'x-dead-letter-routing-key': 'orders.dlq',
                    'x-max-priority': 10,
                },
            },
            bindings: [
                { exchange: 'neuraltrade.orders', pattern: 'order.create' },
                { exchange: 'neuraltrade.orders', pattern: 'order.cancel' },
            ],
            description: 'Order execution requests',
        },

        ordersUpdates: {
            name: 'orders.updates',
            options: {
                durable: true,
                arguments: {
                    'x-message-ttl': 3600000, // 1 hora
                },
            },
            bindings: [
                { exchange: 'neuraltrade.orders', pattern: 'order.update' },
                { exchange: 'neuraltrade.orders', pattern: 'order.filled' },
                { exchange: 'neuraltrade.orders', pattern: 'order.rejected' },
            ],
            description: 'Order status updates',
        },

        // ═══════════════════════════════════════════════════════════
        // DEAD LETTER QUEUES
        // ═══════════════════════════════════════════════════════════

        ticksDlq: {
            name: 'market.ticks.dlq',
            options: {
                durable: true,
                arguments: {
                    'x-message-ttl': 604800000, // 7 días
                },
            },
            bindings: [
                { exchange: 'neuraltrade.dlx', pattern: 'market.ticks.dlq' },
            ],
            description: 'Dead letter queue for failed ticks',
        },

        ohlcvDlq: {
            name: 'market.ohlcv.dlq',
            options: {
                durable: true,
                arguments: {
                    'x-message-ttl': 604800000, // 7 días
                },
            },
            bindings: [
                { exchange: 'neuraltrade.dlx', pattern: 'market.ohlcv.dlq' },
            ],
            description: 'Dead letter queue for failed OHLCV',
        },

        signalsDlq: {
            name: 'signals.dlq',
            options: {
                durable: true,
                arguments: {
                    'x-message-ttl': 2592000000, // 30 días
                },
            },
            bindings: [
                { exchange: 'neuraltrade.dlx', pattern: 'signals.dlq' },
            ],
            description: 'Dead letter queue for failed signals',
        },

        ordersDlq: {
            name: 'orders.dlq',
            options: {
                durable: true,
                arguments: {
                    'x-message-ttl': 2592000000, // 30 días
                },
            },
            bindings: [
                { exchange: 'neuraltrade.dlx', pattern: 'orders.dlq' },
            ],
            description: 'Dead letter queue for failed orders - CRITICAL',
        },

        // ═══════════════════════════════════════════════════════════
        // RETRY QUEUES (con delay)
        // ═══════════════════════════════════════════════════════════

        retry1s: {
            name: 'retry.1s',
            options: {
                durable: true,
                arguments: {
                    'x-message-ttl': 1000,
                    'x-dead-letter-exchange': '', // Default exchange
                    // El routing key original se preserva
                },
            },
            bindings: [
                { exchange: 'neuraltrade.retry', pattern: 'retry.1s' },
            ],
            description: 'Retry after 1 second',
        },

        retry5s: {
            name: 'retry.5s',
            options: {
                durable: true,
                arguments: {
                    'x-message-ttl': 5000,
                    'x-dead-letter-exchange': '',
                },
            },
            bindings: [
                { exchange: 'neuraltrade.retry', pattern: 'retry.5s' },
            ],
            description: 'Retry after 5 seconds',
        },

        retry30s: {
            name: 'retry.30s',
            options: {
                durable: true,
                arguments: {
                    'x-message-ttl': 30000,
                    'x-dead-letter-exchange': '',
                },
            },
            bindings: [
                { exchange: 'neuraltrade.retry', pattern: 'retry.30s' },
            ],
            description: 'Retry after 30 seconds',
        },

        retry5m: {
            name: 'retry.5m',
            options: {
                durable: true,
                arguments: {
                    'x-message-ttl': 300000,
                    'x-dead-letter-exchange': '',
                },
            },
            bindings: [
                { exchange: 'neuraltrade.retry', pattern: 'retry.5m' },
            ],
            description: 'Retry after 5 minutes',
        },
    },
};

// ═══════════════════════════════════════════════════════════════
// SETUP FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Inicializa toda la topología de RabbitMQ
 */
export async function setupTopology(channel: Channel): Promise<void> {
    console.log('[RabbitMQ] Setting up topology...\n');

    // Crear exchanges
    console.log('Creating exchanges:');
    for (const [key, exchange] of Object.entries(TOPOLOGY.exchanges)) {
        await channel.assertExchange(exchange.name, exchange.type, exchange.options);
        console.log(`  ✓ ${exchange.name} (${exchange.type}) - ${exchange.description}`);
    }

    console.log('\nCreating queues:');
    // Crear colas y bindings
    for (const [key, queue] of Object.entries(TOPOLOGY.queues)) {
        await channel.assertQueue(queue.name, queue.options);

        for (const binding of queue.bindings) {
            await channel.bindQueue(queue.name, binding.exchange, binding.pattern);
        }

        const bindingPatterns = queue.bindings.map((b) => b.pattern).join(', ');
        console.log(`  ✓ ${queue.name} ← [${bindingPatterns}]`);
        console.log(`      ${queue.description}`);
    }

    console.log('\n[RabbitMQ] Topology setup complete');
}

/**
 * Elimina toda la topología (para testing/reset)
 */
export async function teardownTopology(channel: Channel): Promise<void> {
    console.log('[RabbitMQ] Tearing down topology...');

    // Eliminar colas primero
    for (const queue of Object.values(TOPOLOGY.queues)) {
        try {
            await channel.deleteQueue(queue.name);
        } catch {
            // Queue might not exist
        }
    }

    // Eliminar exchanges
    for (const exchange of Object.values(TOPOLOGY.exchanges)) {
        try {
            await channel.deleteExchange(exchange.name);
        } catch {
            // Exchange might not exist
        }
    }

    console.log('[RabbitMQ] Topology torn down');
}

// ═══════════════════════════════════════════════════════════════
// ROUTING HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Genera routing key para ticks
 */
export function tickRoutingKey(exchange: string, symbol: string): string {
    return `tick.${exchange}.${symbol.replace('/', '_')}`;
}

/**
 * Genera routing key para OHLCV
 */
export function ohlcvRoutingKey(
    exchange: string,
    symbol: string,
    timeframe: string,
): string {
    return `ohlcv.${exchange}.${symbol.replace('/', '_')}.${timeframe}`;
}

/**
 * Genera routing key para señales
 */
export function signalRoutingKey(confidence: number): string {
    if (confidence >= 0.85) return 'signal.high';
    if (confidence >= 0.7) return 'signal.medium';
    return 'signal.low';
}

/**
 * Determina cola de retry basado en número de intento
 */
export function getRetryQueue(attemptNumber: number): string {
    const delays = ['retry.1s', 'retry.5s', 'retry.30s', 'retry.5m'];
    const index = Math.min(attemptNumber - 1, delays.length - 1);
    return delays[index];
}


export default TOPOLOGY;
