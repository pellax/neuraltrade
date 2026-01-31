/**
 * Telegram Channel Service
 * Send notifications via Telegram Bot API
 */

import { createLogger } from '../utils/logger.js';
import { env } from '../utils/env.js';
import { renderTelegram } from './template.js';
import type {
    NotificationRequest,
    NotificationResult,
    NotificationPreferences,
} from '../types/index.js';

const log = createLogger('TelegramService');

// ============================================
// API HELPERS
// ============================================

interface TelegramResponse {
    ok: boolean;
    result?: {
        message_id: number;
    };
    description?: string;
    error_code?: number;
}

async function callTelegramApi<T>(
    method: string,
    params: Record<string, unknown>
): Promise<T | null> {
    if (!env.TELEGRAM_BOT_TOKEN) {
        log.warn('Telegram bot token not configured');
        return null;
    }

    const url = `${env.TELEGRAM_API_URL}/bot${env.TELEGRAM_BOT_TOKEN}/${method}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });

        const data = await response.json() as TelegramResponse;

        if (!data.ok) {
            log.error({
                method,
                error: data.description,
                errorCode: data.error_code,
            }, 'Telegram API error');
            return null;
        }

        return data.result as T;
    } catch (error) {
        log.error({ error, method }, 'Failed to call Telegram API');
        return null;
    }
}

// ============================================
// SENDING
// ============================================

/**
 * Send Telegram notification
 */
export async function sendTelegram(
    request: NotificationRequest,
    preferences: NotificationPreferences
): Promise<NotificationResult> {
    const result: NotificationResult = {
        notificationId: request.id,
        channel: 'telegram',
        status: 'failed',
    };

    // Check if Telegram is enabled and verified
    if (!preferences.telegram.enabled) {
        result.status = 'skipped';
        result.error = 'Telegram notifications disabled';
        return result;
    }

    if (!preferences.telegram.verified || !preferences.telegram.chatId) {
        result.status = 'skipped';
        result.error = 'Telegram not configured';
        return result;
    }

    // Check notification type preference
    if (!preferences.telegram.types.includes(request.type)) {
        result.status = 'skipped';
        result.error = `Telegram not enabled for type: ${request.type}`;
        return result;
    }

    if (!env.TELEGRAM_BOT_TOKEN) {
        result.error = 'Telegram bot token not configured';
        return result;
    }

    try {
        // Render message
        const text = renderTelegram(request.type, request.data);

        // Send message
        const response = await callTelegramApi<{ message_id: number }>('sendMessage', {
            chat_id: preferences.telegram.chatId,
            text,
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
        });

        if (response) {
            result.status = 'sent';
            result.sentAt = new Date();
            result.messageId = response.message_id.toString();

            log.info({
                notificationId: request.id,
                chatId: preferences.telegram.chatId,
                messageId: response.message_id,
            }, 'Telegram message sent');
        } else {
            result.error = 'Failed to send Telegram message';
        }

    } catch (error) {
        result.error = (error as Error).message;
        log.error({
            error,
            notificationId: request.id,
            chatId: preferences.telegram.chatId,
        }, 'Failed to send Telegram message');
    }

    return result;
}

// ============================================
// BOT SETUP
// ============================================

/**
 * Get bot info
 */
export async function getBotInfo(): Promise<{ username: string } | null> {
    return callTelegramApi('getMe', {});
}

/**
 * Set webhook for receiving updates
 */
export async function setWebhook(url: string): Promise<boolean> {
    const result = await callTelegramApi('setWebhook', {
        url,
        allowed_updates: ['message'],
    });
    return result !== null;
}

/**
 * Generate start link for user verification
 */
export function generateStartLink(userId: string): string {
    const botUsername = 'NeuralTradeBot'; // Would get from getMe
    const payload = Buffer.from(userId).toString('base64');
    return `https://t.me/${botUsername}?start=${payload}`;
}

/**
 * Parse start command payload
 */
export function parseStartPayload(payload: string): string | null {
    try {
        return Buffer.from(payload, 'base64').toString('utf-8');
    } catch {
        return null;
    }
}

/**
 * Send verification message to new chat
 */
export async function sendVerificationMessage(
    chatId: string,
    userId: string
): Promise<boolean> {
    const message = `
🤖 *Welcome to NeuralTrade Bot!*

Your Telegram is now linked to your NeuralTrade account.

✅ You will receive trading notifications here.

*Commands:*
/status - Check your trading status
/mute - Mute notifications for 1 hour
/unmute - Resume notifications
/settings - Notification settings

_Manage preferences in your dashboard._
`;

    const response = await callTelegramApi('sendMessage', {
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[
                { text: '📊 Open Dashboard', url: 'https://app.neuraltrade.io' },
            ]],
        },
    });

    return response !== null;
}

/**
 * Send quick notification with inline keyboard
 */
export async function sendQuickAction(
    chatId: string,
    message: string,
    buttons: Array<{ text: string; url?: string; callback_data?: string }>
): Promise<boolean> {
    const inlineKeyboard = buttons.map(btn => [{
        text: btn.text,
        url: btn.url,
        callback_data: btn.callback_data,
    }]);

    const response = await callTelegramApi('sendMessage', {
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: inlineKeyboard },
    });

    return response !== null;
}
