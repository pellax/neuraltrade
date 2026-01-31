/**
 * Template Engine Service
 * Handlebars-based HTML template rendering
 */

import Handlebars from 'handlebars';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../utils/logger.js';
import type { NotificationData, NotificationType } from '../types/index.js';

const log = createLogger('TemplateService');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Template cache
const templateCache: Map<string, Handlebars.TemplateDelegate> = new Map();
let baseTemplate: Handlebars.TemplateDelegate | null = null;

// ============================================
// HANDLEBARS HELPERS
// ============================================

// Register custom helpers
Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('neq', (a, b) => a !== b);
Handlebars.registerHelper('gt', (a, b) => a > b);
Handlebars.registerHelper('gte', (a, b) => a >= b);
Handlebars.registerHelper('lt', (a, b) => a < b);
Handlebars.registerHelper('lte', (a, b) => a <= b);

Handlebars.registerHelper('uppercase', (str: string) => str?.toUpperCase() ?? '');
Handlebars.registerHelper('lowercase', (str: string) => str?.toLowerCase() ?? '');
Handlebars.registerHelper('capitalize', (str: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
});

Handlebars.registerHelper('formatNumber', (num: number, decimals: number = 2) => {
    if (typeof num !== 'number') return '0';
    return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
});

Handlebars.registerHelper('formatPercent', (num: number) => {
    if (typeof num !== 'number') return '0%';
    return `${(num * 100).toFixed(1)}%`;
});

Handlebars.registerHelper('formatDate', (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
});

Handlebars.registerHelper('json', (context) => JSON.stringify(context, null, 2));

// ============================================
// TEMPLATE LOADING
// ============================================

function getTemplatesDir(): string {
    return join(__dirname, '..', 'templates');
}

function loadTemplate(name: string): Handlebars.TemplateDelegate | null {
    if (templateCache.has(name)) {
        return templateCache.get(name)!;
    }

    const templatePath = join(getTemplatesDir(), `${name}.html`);

    if (!existsSync(templatePath)) {
        log.warn({ name, templatePath }, 'Template not found');
        return null;
    }

    try {
        const content = readFileSync(templatePath, 'utf-8');
        const compiled = Handlebars.compile(content);
        templateCache.set(name, compiled);
        return compiled;
    } catch (error) {
        log.error({ error, name }, 'Failed to load template');
        return null;
    }
}

function getBaseTemplate(): Handlebars.TemplateDelegate {
    if (baseTemplate) return baseTemplate;

    const basePath = join(getTemplatesDir(), 'base.html');

    if (!existsSync(basePath)) {
        // Fallback to simple template
        baseTemplate = Handlebars.compile('<html><body>{{{body}}}</body></html>');
        return baseTemplate;
    }

    const content = readFileSync(basePath, 'utf-8');
    baseTemplate = Handlebars.compile(content);
    return baseTemplate;
}

// ============================================
// TEMPLATE RENDERING
// ============================================

export interface RenderContext {
    data: NotificationData;
    dashboardUrl: string;
    settingsUrl: string;
    unsubscribeUrl: string;
    year: number;
}

/**
 * Get template name for notification type
 */
function getTemplateName(type: NotificationType): string {
    const templateMap: Record<NotificationType, string> = {
        trade_executed: 'trade-executed',
        trade_failed: 'trade-executed',
        signal_generated: 'signal-generated',
        stop_loss_triggered: 'trade-executed',
        take_profit_triggered: 'trade-executed',
        daily_summary: 'daily-summary',
        risk_alert: 'risk-alert',
        account_alert: 'risk-alert',
        system_alert: 'risk-alert',
        welcome: 'welcome',
        password_reset: 'password-reset',
        two_factor_setup: 'two-factor',
    };

    return templateMap[type] ?? 'generic';
}

/**
 * Render HTML email from notification data
 */
export function renderEmail(
    type: NotificationType,
    data: NotificationData,
    options: {
        userId: string;
        dashboardUrl?: string;
    }
): string {
    const templateName = getTemplateName(type);
    const contentTemplate = loadTemplate(templateName);
    const base = getBaseTemplate();

    const context: RenderContext = {
        data,
        dashboardUrl: options.dashboardUrl ?? 'https://app.neuraltrade.io',
        settingsUrl: `${options.dashboardUrl ?? 'https://app.neuraltrade.io'}/settings`,
        unsubscribeUrl: `${options.dashboardUrl ?? 'https://app.neuraltrade.io'}/unsubscribe?userId=${options.userId}`,
        year: new Date().getFullYear(),
    };

    // Flatten data into context for easier access
    const flatContext = {
        ...context,
        ...data,
        title: data.title,
        message: data.message,
        totalValue: data.trade ? data.trade.amount * data.trade.price : undefined,
    };

    // Render content
    let body: string;
    if (contentTemplate) {
        body = contentTemplate(flatContext);
    } else {
        // Fallback to simple text
        body = `
            <h1>${data.title}</h1>
            <p>${data.message}</p>
        `;
    }

    // Wrap in base template
    return base({ ...flatContext, body });
}

/**
 * Render plain text version
 */
export function renderPlainText(
    type: NotificationType,
    data: NotificationData
): string {
    let text = `${data.title}\n${'='.repeat(data.title.length)}\n\n${data.message}\n`;

    if (data.trade) {
        text += `\n--- Trade Details ---\n`;
        text += `Symbol: ${data.trade.symbol}\n`;
        text += `Side: ${data.trade.side.toUpperCase()}\n`;
        text += `Amount: ${data.trade.amount}\n`;
        text += `Price: $${data.trade.price}\n`;
        if (data.trade.pnl !== undefined) {
            text += `P&L: $${data.trade.pnl.toFixed(2)} (${data.trade.pnlPercent?.toFixed(2)}%)\n`;
        }
    }

    if (data.signal) {
        text += `\n--- Signal Details ---\n`;
        text += `Symbol: ${data.signal.symbol}\n`;
        text += `Direction: ${data.signal.direction.toUpperCase()}\n`;
        text += `Confidence: ${(data.signal.confidence * 100).toFixed(1)}%\n`;
        if (data.signal.suggestedEntry) text += `Entry: $${data.signal.suggestedEntry}\n`;
        if (data.signal.stopLoss) text += `Stop Loss: $${data.signal.stopLoss}\n`;
        if (data.signal.takeProfit) text += `Take Profit: $${data.signal.takeProfit}\n`;
    }

    if (data.summary) {
        text += `\n--- ${data.summary.period} Summary ---\n`;
        text += `Total Trades: ${data.summary.totalTrades}\n`;
        text += `Win Rate: ${data.summary.winRate.toFixed(1)}%\n`;
        text += `P&L: $${data.summary.pnl.toFixed(2)} (${data.summary.pnlPercent.toFixed(2)}%)\n`;
    }

    text += `\n---\nNeuralTrade - AI-Powered Trading Platform\n`;

    return text;
}

/**
 * Render Telegram message (Markdown format)
 */
export function renderTelegram(
    type: NotificationType,
    data: NotificationData
): string {
    let msg = `*${escapeMarkdown(data.title)}*\n\n${escapeMarkdown(data.message)}\n`;

    if (data.trade) {
        const pnlEmoji = (data.trade.pnl ?? 0) >= 0 ? '🟢' : '🔴';
        const sideEmoji = data.trade.side === 'buy' ? '📈' : '📉';

        msg += `\n${sideEmoji} *Trade Executed*\n`;
        msg += `├ Symbol: \`${data.trade.symbol}\`\n`;
        msg += `├ Side: ${data.trade.side.toUpperCase()}\n`;
        msg += `├ Amount: ${data.trade.amount}\n`;
        msg += `├ Price: $${data.trade.price.toFixed(2)}\n`;
        if (data.trade.pnl !== undefined) {
            msg += `└ P&L: ${pnlEmoji} $${data.trade.pnl.toFixed(2)} (${data.trade.pnlPercent?.toFixed(2)}%)\n`;
        }
    }

    if (data.signal) {
        const dirEmoji = data.signal.direction === 'long' ? '🟢' : data.signal.direction === 'short' ? '🔴' : '⚪';

        msg += `\n📊 *New Signal*\n`;
        msg += `├ Symbol: \`${data.signal.symbol}\`\n`;
        msg += `├ Direction: ${dirEmoji} ${data.signal.direction.toUpperCase()}\n`;
        msg += `├ Confidence: ${(data.signal.confidence * 100).toFixed(1)}%\n`;
        if (data.signal.suggestedEntry) msg += `├ Entry: $${data.signal.suggestedEntry.toFixed(2)}\n`;
        if (data.signal.stopLoss) msg += `├ SL: $${data.signal.stopLoss.toFixed(2)}\n`;
        if (data.signal.takeProfit) msg += `└ TP: $${data.signal.takeProfit.toFixed(2)}\n`;
    }

    if (data.summary) {
        const pnlEmoji = data.summary.pnl >= 0 ? '🟢' : '🔴';

        msg += `\n📈 *${capitalize(data.summary.period)} Summary*\n`;
        msg += `├ Trades: ${data.summary.totalTrades}\n`;
        msg += `├ Win Rate: ${data.summary.winRate.toFixed(1)}%\n`;
        msg += `└ P&L: ${pnlEmoji} $${data.summary.pnl.toFixed(2)} (${data.summary.pnlPercent.toFixed(2)}%)\n`;
    }

    return msg;
}

/**
 * Render Discord embed
 */
export function renderDiscord(
    type: NotificationType,
    data: NotificationData
): object {
    const colorMap: Record<NotificationType, number> = {
        trade_executed: 0x4ade80,    // Green
        trade_failed: 0xf87171,       // Red
        signal_generated: 0x06b6d4,   // Cyan
        stop_loss_triggered: 0xf87171,
        take_profit_triggered: 0x4ade80,
        daily_summary: 0x8b5cf6,      // Purple
        risk_alert: 0xfacc15,         // Yellow
        account_alert: 0xf87171,
        system_alert: 0x94a3b8,       // Gray
        welcome: 0x06b6d4,
        password_reset: 0x94a3b8,
        two_factor_setup: 0x06b6d4,
    };

    const embed: any = {
        title: data.title,
        description: data.message,
        color: colorMap[type] ?? 0x06b6d4,
        timestamp: new Date().toISOString(),
        footer: {
            text: 'NeuralTrade',
            icon_url: 'https://neuraltrade.io/logo.png',
        },
        fields: [],
    };

    if (data.trade) {
        embed.fields.push(
            { name: 'Symbol', value: data.trade.symbol, inline: true },
            { name: 'Side', value: data.trade.side.toUpperCase(), inline: true },
            { name: 'Amount', value: data.trade.amount.toString(), inline: true },
            { name: 'Price', value: `$${data.trade.price.toFixed(2)}`, inline: true }
        );
        if (data.trade.pnl !== undefined) {
            embed.fields.push({
                name: 'P&L',
                value: `$${data.trade.pnl.toFixed(2)} (${data.trade.pnlPercent?.toFixed(2)}%)`,
                inline: true,
            });
        }
    }

    if (data.signal) {
        embed.fields.push(
            { name: 'Symbol', value: data.signal.symbol, inline: true },
            { name: 'Direction', value: data.signal.direction.toUpperCase(), inline: true },
            { name: 'Confidence', value: `${(data.signal.confidence * 100).toFixed(1)}%`, inline: true }
        );
    }

    if (data.summary) {
        embed.fields.push(
            { name: 'Trades', value: data.summary.totalTrades.toString(), inline: true },
            { name: 'Win Rate', value: `${data.summary.winRate.toFixed(1)}%`, inline: true },
            { name: 'P&L', value: `$${data.summary.pnl.toFixed(2)}`, inline: true }
        );
    }

    return { embeds: [embed] };
}

// ============================================
// HELPERS
// ============================================

function escapeMarkdown(text: string): string {
    return text.replace(/([_*\[\]()~`>#+=|{}.!-])/g, '\\$1');
}

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Clear template cache (for hot reload)
 */
export function clearCache(): void {
    templateCache.clear();
    baseTemplate = null;
    log.info('Template cache cleared');
}
