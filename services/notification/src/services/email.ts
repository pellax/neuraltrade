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
        const verifyUrl = `${env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;

        await transporter.sendMail({
            from: env.EMAIL_FROM,
            to: email,
            subject: '🔐 Verify your NeuralTrade email',
            text: `Welcome to NeuralTrade! Click this link to verify your email: ${verifyUrl}\n\nThis link expires in 24 hours.`,
            html: `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px; border-radius: 16px;">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <div style="font-size: 40px; margin-bottom: 8px;">🧠</div>
                        <h1 style="margin: 0; font-size: 28px; color: #06b6d4;">NeuralTrade</h1>
                        <p style="margin: 8px 0 0; color: #94a3b8; font-size: 14px;">AI-Powered Algorithmic Trading</p>
                    </div>
                    <h2 style="color: #ffffff; font-size: 22px; margin-bottom: 16px;">Verify Your Email Address</h2>
                    <p style="color: #cbd5e1; line-height: 1.6; margin-bottom: 24px;">Welcome to NeuralTrade! Click the button below to verify your email and start trading with AI-powered signals.</p>
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="${verifyUrl}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 15px rgba(6, 182, 212, 0.4);">Verify Email Address</a>
                    </div>
                    <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">If the button doesn't work, copy this URL: <a href="${verifyUrl}" style="color: #06b6d4;">${verifyUrl}</a></p>
                    <div style="margin-top: 24px; padding: 12px; background: rgba(251, 191, 36, 0.1); border-left: 4px solid #fbbf24; border-radius: 4px;">
                        <p style="margin: 0; color: #fbbf24; font-size: 13px;">⏰ This link expires in 24 hours.</p>
                    </div>
                    <p style="color: #64748b; font-size: 12px; margin-top: 24px;">If you didn't create an account, please ignore this email.</p>
                </div>
            `,
        });

        log.info({ to: email }, 'Verification email sent');
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
        const resetUrl = `${env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;

        await transporter.sendMail({
            from: env.EMAIL_FROM,
            to: email,
            subject: '🔑 Reset your NeuralTrade password',
            text: `Click this link to reset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, please ignore this email.`,
            html: `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px; border-radius: 16px;">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <div style="font-size: 40px; margin-bottom: 8px;">🧠</div>
                        <h1 style="margin: 0; font-size: 28px; color: #06b6d4;">NeuralTrade</h1>
                        <p style="margin: 8px 0 0; color: #94a3b8; font-size: 14px;">AI-Powered Algorithmic Trading</p>
                    </div>
                    <h2 style="color: #ffffff; font-size: 22px; margin-bottom: 16px;">Reset Your Password</h2>
                    <p style="color: #cbd5e1; line-height: 1.6; margin-bottom: 24px;">We received a request to reset your password. Click the button below to create a new password.</p>
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="${resetUrl}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 15px rgba(6, 182, 212, 0.4);">Reset Password</a>
                    </div>
                    <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">If the button doesn't work, copy this URL: <a href="${resetUrl}" style="color: #06b6d4;">${resetUrl}</a></p>
                    <div style="margin-top: 24px; padding: 12px; background: rgba(248, 113, 113, 0.1); border-left: 4px solid #f87171; border-radius: 4px;">
                        <p style="margin: 0; color: #f87171; font-size: 13px;">⏰ This link expires in 1 hour.</p>
                    </div>
                    <p style="color: #64748b; font-size: 12px; margin-top: 24px;">If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
                </div>
            `,
        });

        log.info({ to: email }, 'Password reset email sent');
        return true;
    } catch (error) {
        log.error({ error, email }, 'Failed to send password reset email');
        return false;
    }
}

