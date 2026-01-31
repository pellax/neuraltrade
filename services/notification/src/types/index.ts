/**
 * Notification Types
 * Type definitions for multi-channel notifications
 */

// ============================================
// NOTIFICATION CHANNELS
// ============================================

export type NotificationChannel = 'email' | 'telegram' | 'discord' | 'push';

export type NotificationType =
    | 'trade_executed'
    | 'trade_failed'
    | 'signal_generated'
    | 'stop_loss_triggered'
    | 'take_profit_triggered'
    | 'daily_summary'
    | 'risk_alert'
    | 'account_alert'
    | 'system_alert'
    | 'welcome'
    | 'password_reset'
    | 'two_factor_setup';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

// ============================================
// NOTIFICATION REQUEST
// ============================================

export interface NotificationRequest {
    id: string;
    userId: string;
    type: NotificationType;
    priority: NotificationPriority;
    channels: NotificationChannel[];
    data: NotificationData;
    scheduledAt?: Date;
    expiresAt?: Date;
    metadata?: Record<string, unknown>;
}

export interface NotificationData {
    // Common fields
    title: string;
    message: string;

    // Trade-related
    trade?: TradeNotificationData;

    // Signal-related
    signal?: SignalNotificationData;

    // Account-related
    account?: AccountNotificationData;

    // Summary-related
    summary?: SummaryNotificationData;

    // Generic data
    extra?: Record<string, unknown>;
}

export interface TradeNotificationData {
    orderId: string;
    symbol: string;
    side: 'buy' | 'sell';
    amount: number;
    price: number;
    status: string;
    pnl?: number;
    pnlPercent?: number;
    strategy?: string;
    exchange?: string;
}

export interface SignalNotificationData {
    signalId: string;
    symbol: string;
    direction: 'long' | 'short' | 'close';
    confidence: number;
    suggestedEntry?: number;
    stopLoss?: number;
    takeProfit?: number;
    strategy?: string;
}

export interface AccountNotificationData {
    alertType: 'margin_warning' | 'daily_loss_limit' | 'position_limit' | 'api_error';
    currentValue?: number;
    threshold?: number;
    message: string;
}

export interface SummaryNotificationData {
    period: 'daily' | 'weekly' | 'monthly';
    totalTrades: number;
    winRate: number;
    pnl: number;
    pnlPercent: number;
    bestTrade?: { symbol: string; pnl: number };
    worstTrade?: { symbol: string; pnl: number };
}

// ============================================
// NOTIFICATION RESULT
// ============================================

export interface NotificationResult {
    notificationId: string;
    channel: NotificationChannel;
    status: 'sent' | 'failed' | 'skipped';
    sentAt?: Date;
    error?: string;
    messageId?: string;
    retryCount?: number;
}

export interface NotificationLog {
    _id?: string;
    notificationId: string;
    userId: string;
    type: NotificationType;
    channels: NotificationChannel[];
    results: NotificationResult[];
    createdAt: Date;
    processedAt?: Date;
}

// ============================================
// USER PREFERENCES
// ============================================

export interface NotificationPreferences {
    userId: string;
    email: EmailPreferences;
    telegram: TelegramPreferences;
    discord: DiscordPreferences;
    push: PushPreferences;
    quietHours?: QuietHours;
    updatedAt: Date;
}

export interface EmailPreferences {
    enabled: boolean;
    address?: string;
    verified: boolean;
    types: NotificationType[];
}

export interface TelegramPreferences {
    enabled: boolean;
    chatId?: string;
    verified: boolean;
    types: NotificationType[];
}

export interface DiscordPreferences {
    enabled: boolean;
    webhookUrl?: string;
    userId?: string;
    types: NotificationType[];
}

export interface PushPreferences {
    enabled: boolean;
    tokens: string[];
    types: NotificationType[];
}

export interface QuietHours {
    enabled: boolean;
    startHour: number;  // 0-23
    endHour: number;    // 0-23
    timezone: string;   // e.g., 'Europe/Madrid'
    allowCritical: boolean;
}

// ============================================
// MESSAGE QUEUE TYPES
// ============================================

export interface NotificationMessage {
    type: 'notification_request';
    payload: NotificationRequest;
    timestamp: Date;
}

// ============================================
// CHANNEL CONFIGS
// ============================================

export interface EmailConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
    from: string;
    replyTo?: string;
}

export interface TelegramConfig {
    botToken: string;
    apiUrl?: string;
}

export interface DiscordConfig {
    defaultWebhookUrl?: string;
    botToken?: string;
}
