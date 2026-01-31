/**
 * Email Channel Service
 * SMTP-based email sending with nodemailer
 */

import nodemailer, { Transporter } from 'nodemailer';
import { createLogger } from '../utils/logger.js';
import { env } from '../utils/env.js';
import { renderEmail, renderPlainText } from './template.js';
import type {
    NotificationRequest,
    NotificationResult,
    NotificationPreferences,
} from '../types/index.js';

const log = createLogger('EmailService');

let transporter: Transporter | null = null;

// ============================================
// INITIALIZATION
// ============================================

export async function initEmailService(): Promise<void> {
    if (transporter) return;

    if (!env.SMTP_USER || !env.SMTP_PASS) {
        log.warn('SMTP credentials not configured, email service disabled');
        return;
    }

    transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
    });

    // Verify connection
    try {
        await transporter.verify();
        log.info({ host: env.SMTP_HOST, port: env.SMTP_PORT }, 'Email service initialized');
    } catch (error) {
        log.error({ error }, 'Failed to verify SMTP connection');
        transporter = null;
    }
}

export async function closeEmailService(): Promise<void> {
    if (transporter) {
        transporter.close();
        transporter = null;
    }
}

// ============================================
// SENDING
// ============================================

/**
 * Send email notification
 */
export async function sendEmail(
    request: NotificationRequest,
    preferences: NotificationPreferences
): Promise<NotificationResult> {
    const result: NotificationResult = {
        notificationId: request.id,
        channel: 'email',
        status: 'failed',
    };

    // Check if email is enabled and verified
    if (!preferences.email.enabled) {
        result.status = 'skipped';
        result.error = 'Email notifications disabled';
        return result;
    }

    if (!preferences.email.verified || !preferences.email.address) {
        result.status = 'skipped';
        result.error = 'Email not verified';
        return result;
    }

    // Check notification type preference
    if (!preferences.email.types.includes(request.type)) {
        result.status = 'skipped';
        result.error = `Email not enabled for type: ${request.type}`;
        return result;
    }

    if (!transporter) {
        result.error = 'Email service not initialized';
        return result;
    }

    try {
        // Render email content
        const html = renderEmail(request.type, request.data, {
            userId: request.userId,
            dashboardUrl: 'https://app.neuraltrade.io',
        });
        const text = renderPlainText(request.type, request.data);

        // Build subject line
        const subject = buildSubject(request);

        // Send email
        const info = await transporter.sendMail({
            from: env.EMAIL_FROM,
            to: preferences.email.address,
            subject,
            text,
            html,
            headers: {
                'X-Notification-ID': request.id,
                'X-Notification-Type': request.type,
                'X-Priority': mapPriority(request.priority),
            },
        });

        result.status = 'sent';
        result.sentAt = new Date();
        result.messageId = info.messageId;

        log.info({
            notificationId: request.id,
            to: preferences.email.address,
            messageId: info.messageId,
        }, 'Email sent successfully');

    } catch (error) {
        result.error = (error as Error).message;
        log.error({
            error,
            notificationId: request.id,
            to: preferences.email.address,
        }, 'Failed to send email');
    }

    return result;
}

// ============================================
// HELPERS
// ============================================

function buildSubject(request: NotificationRequest): string {
    const prefixes: Record<string, string> = {
        critical: '🚨 ',
        high: '⚠️ ',
        normal: '',
        low: '',
    };

    const prefix = prefixes[request.priority] ?? '';
    return `${prefix}${request.data.title}`;
}

function mapPriority(priority: string): string {
    const map: Record<string, string> = {
        critical: '1',
        high: '2',
        normal: '3',
        low: '5',
    };
    return map[priority] ?? '3';
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(
    email: string,
    verificationToken: string
): Promise<boolean> {
    if (!transporter) {
        log.warn('Email service not initialized');
        return false;
    }

    try {
        const verifyUrl = `https://app.neuraltrade.io/verify-email?token=${verificationToken}`;

        await transporter.sendMail({
            from: env.EMAIL_FROM,
            to: email,
            subject: 'Verify your NeuralTrade email',
            text: `Click this link to verify your email: ${verifyUrl}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #06b6d4;">Verify Your Email</h1>
                    <p>Click the button below to verify your email address:</p>
                    <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); color: white; text-decoration: none; border-radius: 8px;">Verify Email</a>
                    <p style="color: #666; margin-top: 20px; font-size: 12px;">If you didn't request this, please ignore this email.</p>
                </div>
            `,
        });

        return true;
    } catch (error) {
        log.error({ error, email }, 'Failed to send verification email');
        return false;
    }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
    email: string,
    resetToken: string
): Promise<boolean> {
    if (!transporter) {
        log.warn('Email service not initialized');
        return false;
    }

    try {
        const resetUrl = `https://app.neuraltrade.io/reset-password?token=${resetToken}`;

        await transporter.sendMail({
            from: env.EMAIL_FROM,
            to: email,
            subject: 'Reset your NeuralTrade password',
            text: `Click this link to reset your password: ${resetUrl}. This link expires in 1 hour.`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #06b6d4;">Reset Your Password</h1>
                    <p>Click the button below to reset your password:</p>
                    <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); color: white; text-decoration: none; border-radius: 8px;">Reset Password</a>
                    <p style="color: #f87171; margin-top: 20px;">This link expires in 1 hour.</p>
                    <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
                </div>
            `,
        });

        return true;
    } catch (error) {
        log.error({ error, email }, 'Failed to send password reset email');
        return false;
    }
}
