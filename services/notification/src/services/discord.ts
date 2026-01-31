/**
 * Discord Channel Service
 * Send notifications via Discord webhooks
 */

import { createLogger } from '../utils/logger.js';
import { env } from '../utils/env.js';
import { renderDiscord } from './template.js';
import type {
    NotificationRequest,
    NotificationResult,
    NotificationPreferences,
} from '../types/index.js';

const log = createLogger('DiscordService');

// ============================================
// WEBHOOK SENDING
// ============================================

interface DiscordWebhookResponse {
    id?: string;
    message?: string;
    code?: number;
}

/**
 * Send Discord webhook
 */
async function sendWebhook(
    webhookUrl: string,
    payload: object
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        // Discord returns 204 No Content on success
        if (response.status === 204) {
            return { success: true };
        }

        // If we got content, try to parse it
        if (response.ok) {
            const data = await response.json() as DiscordWebhookResponse;
            return { success: true, messageId: data.id };
        }

        const errorData = await response.json() as DiscordWebhookResponse;
        return {
            success: false,
            error: errorData.message ?? `HTTP ${response.status}`,
        };

    } catch (error) {
        return {
            success: false,
            error: (error as Error).message,
        };
    }
}

// ============================================
// SENDING
// ============================================

/**
 * Send Discord notification
 */
export async function sendDiscord(
    request: NotificationRequest,
    preferences: NotificationPreferences
): Promise<NotificationResult> {
    const result: NotificationResult = {
        notificationId: request.id,
        channel: 'discord',
        status: 'failed',
    };

    // Check if Discord is enabled
    if (!preferences.discord.enabled) {
        result.status = 'skipped';
        result.error = 'Discord notifications disabled';
        return result;
    }

    // Get webhook URL
    const webhookUrl = preferences.discord.webhookUrl ?? env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
        result.status = 'skipped';
        result.error = 'Discord webhook not configured';
        return result;
    }

    // Check notification type preference
    if (!preferences.discord.types.includes(request.type)) {
        result.status = 'skipped';
        result.error = `Discord not enabled for type: ${request.type}`;
        return result;
    }

    try {
        // Render Discord embed
        const embed = renderDiscord(request.type, request.data);

        // Add username and avatar
        const payload = {
            username: 'NeuralTrade',
            avatar_url: 'https://neuraltrade.io/logo.png',
            ...embed,
        };

        // Send webhook
        const response = await sendWebhook(webhookUrl, payload);

        if (response.success) {
            result.status = 'sent';
            result.sentAt = new Date();
            result.messageId = response.messageId;

            log.info({
                notificationId: request.id,
                messageId: response.messageId,
            }, 'Discord message sent');
        } else {
            result.error = response.error;
            log.error({
                error: response.error,
                notificationId: request.id,
            }, 'Failed to send Discord message');
        }

    } catch (error) {
        result.error = (error as Error).message;
        log.error({
            error,
            notificationId: request.id,
        }, 'Failed to send Discord message');
    }

    return result;
}

// ============================================
// WEBHOOK MANAGEMENT
// ============================================

/**
 * Test a webhook URL
 */
export async function testWebhook(webhookUrl: string): Promise<boolean> {
    const testPayload = {
        username: 'NeuralTrade',
        avatar_url: 'https://neuraltrade.io/logo.png',
        content: '✅ Webhook test successful! You will receive trading notifications here.',
        embeds: [{
            title: 'NeuralTrade Connected',
            description: 'Your Discord channel is now linked to NeuralTrade.',
            color: 0x06b6d4,
            footer: { text: 'This is a test notification' },
        }],
    };

    const response = await sendWebhook(webhookUrl, testPayload);
    return response.success;
}

/**
 * Validate webhook URL format
 */
export function isValidWebhookUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return (
            parsed.protocol === 'https:' &&
            parsed.hostname === 'discord.com' &&
            parsed.pathname.startsWith('/api/webhooks/')
        );
    } catch {
        return false;
    }
}

// ============================================
// RICH EMBEDS
// ============================================

/**
 * Send a custom rich embed
 */
export async function sendRichEmbed(
    webhookUrl: string,
    embed: {
        title: string;
        description: string;
        color?: number;
        fields?: Array<{ name: string; value: string; inline?: boolean }>;
        thumbnail?: string;
        image?: string;
        footer?: string;
        timestamp?: boolean;
    }
): Promise<boolean> {
    const payload = {
        username: 'NeuralTrade',
        avatar_url: 'https://neuraltrade.io/logo.png',
        embeds: [{
            title: embed.title,
            description: embed.description,
            color: embed.color ?? 0x06b6d4,
            fields: embed.fields ?? [],
            thumbnail: embed.thumbnail ? { url: embed.thumbnail } : undefined,
            image: embed.image ? { url: embed.image } : undefined,
            footer: embed.footer ? { text: embed.footer } : { text: 'NeuralTrade' },
            timestamp: embed.timestamp ? new Date().toISOString() : undefined,
        }],
    };

    const response = await sendWebhook(webhookUrl, payload);
    return response.success;
}

/**
 * Send action buttons (using URL buttons only, as webhooks don't support interactions)
 */
export async function sendWithActions(
    webhookUrl: string,
    content: string,
    actions: Array<{ label: string; url: string; emoji?: string }>
): Promise<boolean> {
    // Discord webhooks don't support button components
    // We'll format as embedded links instead
    const actionLinks = actions
        .map(a => `[${a.emoji ?? '🔗'} ${a.label}](${a.url})`)
        .join(' | ');

    const payload = {
        username: 'NeuralTrade',
        avatar_url: 'https://neuraltrade.io/logo.png',
        content,
        embeds: [{
            description: actionLinks,
            color: 0x06b6d4,
        }],
    };

    const response = await sendWebhook(webhookUrl, payload);
    return response.success;
}
