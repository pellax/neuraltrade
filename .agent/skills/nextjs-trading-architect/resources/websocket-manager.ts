/**
 * NeuralTrade - WebSocket Manager
 * 
 * Singleton para gestionar conexiones WebSocket con:
 * - Reconexión automática con backoff exponencial
 * - Suscripción a múltiples canales
 * - Heartbeat para mantener conexión
 * - Type-safe message handling
 */

type MessageHandler<T = unknown> = (data: T) => void;
type ConnectionHandler = () => void;

interface SubscriptionOptions {
    /** Callback cuando se recibe un mensaje */
    onMessage: MessageHandler;
    /** Callback cuando se suscribe exitosamente */
    onSubscribed?: () => void;
    /** Callback cuando hay error */
    onError?: (error: Error) => void;
}

interface WebSocketConfig {
    /** URL del WebSocket server */
    url: string;
    /** Máximo número de intentos de reconexión */
    maxReconnects?: number;
    /** Delay base para reconexión (ms) */
    reconnectDelay?: number;
    /** Intervalo de heartbeat (ms) */
    heartbeatInterval?: number;
    /** Timeout para considerar conexión muerta (ms) */
    heartbeatTimeout?: number;
}

/**
 * WebSocket Manager Singleton
 * 
 * @example
 * ```ts
 * const wsManager = WebSocketManager.getInstance();
 * wsManager.connect('wss://api.neuraltrade.com/ws');
 * 
 * const unsubscribe = wsManager.subscribe('price:BTC/USDT', {
 *   onMessage: (data) => console.log('Price:', data),
 *   onSubscribed: () => console.log('Subscribed!'),
 * });
 * 
 * // Later...
 * unsubscribe();
 * ```
 */
export class WebSocketManager {
    private static instance: WebSocketManager | null = null;

    private ws: WebSocket | null = null;
    private config: Required<WebSocketConfig> | null = null;

    // Connection state
    private isConnecting = false;
    private reconnectAttempts = 0;
    private reconnectTimeout: NodeJS.Timeout | null = null;

    // Heartbeat
    private heartbeatTimer: NodeJS.Timeout | null = null;
    private lastPong = Date.now();

    // Subscriptions
    private subscriptions = new Map<string, Set<MessageHandler>>();
    private pendingSubscriptions = new Set<string>();

    // Event handlers
    private onConnectHandlers = new Set<ConnectionHandler>();
    private onDisconnectHandlers = new Set<ConnectionHandler>();

    private constructor() { }

    /**
     * Obtiene la instancia singleton
     */
    static getInstance(): WebSocketManager {
        if (!WebSocketManager.instance) {
            WebSocketManager.instance = new WebSocketManager();
        }
        return WebSocketManager.instance;
    }

    /**
     * Conecta al servidor WebSocket
     */
    connect(url: string, options: Partial<WebSocketConfig> = {}): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            console.log('[WS] Already connected');
            return;
        }

        if (this.isConnecting) {
            console.log('[WS] Connection in progress');
            return;
        }

        this.config = {
            url,
            maxReconnects: options.maxReconnects ?? 10,
            reconnectDelay: options.reconnectDelay ?? 1000,
            heartbeatInterval: options.heartbeatInterval ?? 30000,
            heartbeatTimeout: options.heartbeatTimeout ?? 10000,
        };

        this.doConnect();
    }

    private doConnect(): void {
        if (!this.config) return;

        this.isConnecting = true;

        try {
            console.log('[WS] Connecting to', this.config.url);
            this.ws = new WebSocket(this.config.url);

            this.ws.onopen = this.handleOpen.bind(this);
            this.ws.onmessage = this.handleMessage.bind(this);
            this.ws.onclose = this.handleClose.bind(this);
            this.ws.onerror = this.handleError.bind(this);
        } catch (error) {
            console.error('[WS] Connection error:', error);
            this.isConnecting = false;
            this.scheduleReconnect();
        }
    }

    private handleOpen(): void {
        console.log('[WS] Connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Start heartbeat
        this.startHeartbeat();

        // Re-subscribe to all channels
        this.resubscribeAll();

        // Notify handlers
        this.onConnectHandlers.forEach(handler => handler());
    }

    private handleMessage(event: MessageEvent): void {
        try {
            const message = JSON.parse(event.data);

            // Handle pong
            if (message.type === 'pong') {
                this.lastPong = Date.now();
                return;
            }

            // Handle subscription confirmation
            if (message.type === 'subscribed') {
                this.pendingSubscriptions.delete(message.channel);
                console.log('[WS] Subscribed to', message.channel);
                return;
            }

            // Route to channel handlers
            const channel = message.channel || 'default';
            const handlers = this.subscriptions.get(channel);

            if (handlers) {
                handlers.forEach(handler => {
                    try {
                        handler(message.data || message);
                    } catch (error) {
                        console.error('[WS] Handler error:', error);
                    }
                });
            }
        } catch (error) {
            console.error('[WS] Message parse error:', error);
        }
    }

    private handleClose(event: CloseEvent): void {
        console.log('[WS] Disconnected:', event.code, event.reason);
        this.isConnecting = false;
        this.stopHeartbeat();

        // Notify handlers
        this.onDisconnectHandlers.forEach(handler => handler());

        // Schedule reconnect
        if (event.code !== 1000) { // 1000 = normal close
            this.scheduleReconnect();
        }
    }

    private handleError(event: Event): void {
        console.error('[WS] Error:', event);
    }

    private scheduleReconnect(): void {
        if (!this.config) return;

        if (this.reconnectAttempts >= this.config.maxReconnects) {
            console.error('[WS] Max reconnection attempts reached');
            return;
        }

        // Clear any existing timeout
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        // Exponential backoff
        const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts);
        const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd

        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.config.maxReconnects})`);

        this.reconnectTimeout = setTimeout(() => {
            this.reconnectAttempts++;
            this.doConnect();
        }, delay + jitter);
    }

    private startHeartbeat(): void {
        if (!this.config) return;

        this.stopHeartbeat();
        this.lastPong = Date.now();

        this.heartbeatTimer = setInterval(() => {
            // Check if we received pong recently
            const timeSinceLastPong = Date.now() - this.lastPong;

            if (timeSinceLastPong > this.config!.heartbeatTimeout) {
                console.warn('[WS] Heartbeat timeout, reconnecting...');
                this.ws?.close();
                return;
            }

            // Send ping
            this.send({ type: 'ping' });
        }, this.config.heartbeatInterval);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    private resubscribeAll(): void {
        // Re-subscribe to all active channels
        this.subscriptions.forEach((_, channel) => {
            this.sendSubscribe(channel);
        });

        // Retry pending subscriptions
        this.pendingSubscriptions.forEach(channel => {
            this.sendSubscribe(channel);
        });
    }

    private sendSubscribe(channel: string): void {
        this.pendingSubscriptions.add(channel);
        this.send({ type: 'subscribe', channel });
    }

    private sendUnsubscribe(channel: string): void {
        this.pendingSubscriptions.delete(channel);
        this.send({ type: 'unsubscribe', channel });
    }

    /**
     * Envía un mensaje al servidor
     */
    send(data: unknown): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.warn('[WS] Cannot send - not connected');
        }
    }

    /**
     * Suscribe a un canal
     * 
     * @returns Función para desuscribirse
     */
    subscribe(channel: string, options: SubscriptionOptions): () => void {
        const { onMessage, onSubscribed, onError } = options;

        // Add handler to set
        if (!this.subscriptions.has(channel)) {
            this.subscriptions.set(channel, new Set());

            // Subscribe on server if connected
            if (this.isConnected) {
                this.sendSubscribe(channel);
            }
        }

        this.subscriptions.get(channel)!.add(onMessage);

        // Call onSubscribed if already subscribed
        if (this.isConnected && !this.pendingSubscriptions.has(channel)) {
            onSubscribed?.();
        }

        // Return unsubscribe function
        return () => {
            const handlers = this.subscriptions.get(channel);
            if (handlers) {
                handlers.delete(onMessage);

                // If no more handlers, unsubscribe from server
                if (handlers.size === 0) {
                    this.subscriptions.delete(channel);
                    if (this.isConnected) {
                        this.sendUnsubscribe(channel);
                    }
                }
            }
        };
    }

    /**
     * Añade handler para evento de conexión
     */
    onConnect(handler: ConnectionHandler): () => void {
        this.onConnectHandlers.add(handler);
        return () => this.onConnectHandlers.delete(handler);
    }

    /**
     * Añade handler para evento de desconexión
     */
    onDisconnect(handler: ConnectionHandler): () => void {
        this.onDisconnectHandlers.add(handler);
        return () => this.onDisconnectHandlers.delete(handler);
    }

    /**
     * Estado de conexión
     */
    get isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    /**
     * Estado de reconexión
     */
    get isReconnecting(): boolean {
        return this.isConnecting || this.reconnectTimeout !== null;
    }

    /**
     * Número de canales suscritos
     */
    get channelCount(): number {
        return this.subscriptions.size;
    }

    /**
     * Desconecta del servidor
     */
    disconnect(): void {
        console.log('[WS] Disconnecting...');

        // Clear timers
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        this.stopHeartbeat();

        // Close connection
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }

        // Clear state
        this.subscriptions.clear();
        this.pendingSubscriptions.clear();
        this.reconnectAttempts = 0;
    }

    /**
     * Destruye la instancia singleton
     */
    static destroy(): void {
        if (WebSocketManager.instance) {
            WebSocketManager.instance.disconnect();
            WebSocketManager.instance = null;
        }
    }
}


// ═══════════════════════════════════════════════════════════════
// REACT HOOKS
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * Hook para usar el WebSocket manager
 */
export function useWebSocket() {
    const [isConnected, setIsConnected] = useState(false);
    const wsManager = useRef(WebSocketManager.getInstance());

    useEffect(() => {
        const manager = wsManager.current;

        // Set initial state
        setIsConnected(manager.isConnected);

        // Listen for connection changes
        const unsubConnect = manager.onConnect(() => setIsConnected(true));
        const unsubDisconnect = manager.onDisconnect(() => setIsConnected(false));

        return () => {
            unsubConnect();
            unsubDisconnect();
        };
    }, []);

    const connect = useCallback((url: string) => {
        wsManager.current.connect(url);
    }, []);

    const disconnect = useCallback(() => {
        wsManager.current.disconnect();
    }, []);

    const send = useCallback((data: unknown) => {
        wsManager.current.send(data);
    }, []);

    return {
        isConnected,
        connect,
        disconnect,
        send,
        manager: wsManager.current,
    };
}

/**
 * Hook para suscribirse a un canal específico
 */
export function useChannel<T = unknown>(channel: string | null) {
    const [data, setData] = useState<T | null>(null);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const wsManager = useRef(WebSocketManager.getInstance());

    useEffect(() => {
        if (!channel) return;

        const unsubscribe = wsManager.current.subscribe(channel, {
            onMessage: (newData) => {
                setData(newData as T);
                setError(null);
            },
            onSubscribed: () => setIsSubscribed(true),
            onError: (err) => setError(err),
        });

        return () => {
            unsubscribe();
            setIsSubscribed(false);
        };
    }, [channel]);

    return {
        data,
        isSubscribed,
        error,
        isConnected: wsManager.current.isConnected,
    };
}

/**
 * Hook para stream de precios
 */
export function usePriceChannel(symbol: string | null) {
    interface PriceData {
        symbol: string;
        price: number;
        bid: number;
        ask: number;
        volume24h: number;
        change24h: number;
        timestamp: number;
    }

    const channel = symbol ? `price:${symbol}` : null;
    const { data, isSubscribed, isConnected } = useChannel<PriceData>(channel);

    return {
        price: data?.price ?? null,
        bid: data?.bid ?? null,
        ask: data?.ask ?? null,
        volume24h: data?.volume24h ?? null,
        change24h: data?.change24h ?? null,
        timestamp: data?.timestamp ?? null,
        isSubscribed,
        isConnected,
    };
}

/**
 * Hook para order book
 */
export function useOrderBookChannel(symbol: string | null, depth = 20) {
    interface OrderBookData {
        bids: Array<{ price: number; quantity: number }>;
        asks: Array<{ price: number; quantity: number }>;
        timestamp: number;
    }

    const channel = symbol ? `orderbook:${symbol}:${depth}` : null;
    const { data, isSubscribed, isConnected } = useChannel<OrderBookData>(channel);

    return {
        bids: data?.bids ?? [],
        asks: data?.asks ?? [],
        timestamp: data?.timestamp ?? null,
        spread: data ? (data.asks[0]?.price ?? 0) - (data.bids[0]?.price ?? 0) : null,
        isSubscribed,
        isConnected,
    };
}


export default WebSocketManager;
