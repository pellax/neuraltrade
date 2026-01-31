/**
 * Authentication Service
 * Handles user registration, login, JWT tokens, and 2FA
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { ObjectId } from 'mongodb';
import { getCollections } from './mongodb.js';
import { blacklistToken, getCache, setCache } from './redis.js';
import { env } from '../utils/env.js';
import { generateRefreshToken } from '../utils/crypto.js';
import { createLogger } from '../utils/logger.js';
import type {
    User,
    UserPublic,
    JwtPayload,
    TokenPair,
    RefreshToken,
} from '../types/index.js';
import type { RegisterInput, LoginInput } from '../types/schemas.js';
import { publishEmailVerification } from './rabbitmq.js';

const log = createLogger('AuthService');

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const EMAIL_VERIFICATION_EXPIRY_HOURS = 24;

// ============================================
// USER MANAGEMENT
// ============================================

/**
 * Create a new user
 */
export async function createUser(input: RegisterInput): Promise<UserPublic> {
    const { users } = getCollections();

    // Check if email exists
    const existing = await users.findOne({ email: input.email.toLowerCase() });
    if (existing) {
        throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    // Generate email verification token
    const emailVerificationToken = generateRefreshToken();
    const emailVerificationExpires = new Date();
    emailVerificationExpires.setHours(emailVerificationExpires.getHours() + EMAIL_VERIFICATION_EXPIRY_HOURS);

    const now = new Date();
    const user: Omit<User, '_id'> = {
        email: input.email.toLowerCase(),
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: 'user',
        subscription: 'free',
        twoFactorEnabled: false,
        emailVerified: false,
        emailVerificationToken,
        emailVerificationExpires,
        createdAt: now,
        updatedAt: now,
    };

    const result = await users.insertOne(user as User);

    log.info({ userId: result.insertedId.toString() }, 'User created');

    // Send verification email via RabbitMQ
    try {
        await publishEmailVerification(input.email.toLowerCase(), emailVerificationToken);
        log.info({ email: input.email }, 'Verification email queued');
    } catch (err) {
        log.error({ err, email: input.email }, 'Failed to queue verification email');
    }

    return toPublicUser({ ...user, _id: result.insertedId.toString() } as User);
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
    const { users } = getCollections();
    return users.findOne({ email: email.toLowerCase() });
}

/**
 * Find user by ID
 */
export async function findUserById(id: string): Promise<User | null> {
    const { users } = getCollections();
    return users.findOne({ _id: new ObjectId(id) as unknown as string });
}

/**
 * Convert User to UserPublic (remove sensitive fields)
 */
export function toPublicUser(user: User): UserPublic {
    return {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        subscription: user.subscription,
        twoFactorEnabled: user.twoFactorEnabled,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
    };
}

// ============================================
// AUTHENTICATION
// ============================================

/**
 * Authenticate user with email/password
 */
export async function authenticateUser(
    input: LoginInput,
    ip?: string,
    userAgent?: string
): Promise<{ user: UserPublic; tokens: TokenPair } | { requires2fa: true }> {
    const user = await findUserByEmail(input.email);

    if (!user) {
        throw new Error('Invalid credentials');
    }

    // Verify password
    const validPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!validPassword) {
        throw new Error('Invalid credentials');
    }

    // Check if email is verified
    if (!user.emailVerified) {
        throw new Error('Email not verified. Please check your inbox for the verification link.');
    }

    // Check 2FA
    if (user.twoFactorEnabled) {
        if (!input.twoFactorCode) {
            return { requires2fa: true };
        }

        const valid = verify2FACode(user.twoFactorSecret!, input.twoFactorCode);
        if (!valid) {
            throw new Error('Invalid 2FA code');
        }
    }

    // Update last login
    const { users } = getCollections();
    await users.updateOne(
        { _id: user._id },
        { $set: { lastLoginAt: new Date() } }
    );

    // Generate tokens
    const tokens = await generateTokenPair(user, ip, userAgent);

    log.info({ userId: user._id.toString() }, 'User authenticated');

    return {
        user: toPublicUser(user),
        tokens,
    };
}

/**
 * Generate access and refresh tokens
 */
export async function generateTokenPair(
    user: User,
    ip?: string,
    userAgent?: string
): Promise<TokenPair> {
    const payload: JwtPayload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        subscription: user.subscription,
    };

    // Generate access token
    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    // Generate refresh token
    const refreshTokenValue = generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    // Store refresh token
    const { refreshTokens } = getCollections();
    await refreshTokens.insertOne({
        userId: user._id.toString(),
        token: refreshTokenValue,
        expiresAt,
        createdAt: new Date(),
        ip,
        userAgent,
    } as RefreshToken);

    return {
        accessToken,
        refreshToken: refreshTokenValue,
        expiresIn: 15 * 60, // 15 minutes in seconds
    };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
    refreshTokenValue: string,
    ip?: string,
    userAgent?: string
): Promise<TokenPair> {
    const { refreshTokens } = getCollections();

    // Find and validate refresh token
    const storedToken = await refreshTokens.findOne({
        token: refreshTokenValue,
        revokedAt: { $exists: false },
    });

    if (!storedToken) {
        throw new Error('Invalid refresh token');
    }

    if (storedToken.expiresAt < new Date()) {
        throw new Error('Refresh token expired');
    }

    // Revoke current refresh token (rotation)
    await refreshTokens.updateOne(
        { _id: storedToken._id },
        { $set: { revokedAt: new Date() } }
    );

    // Get user
    const user = await findUserById(storedToken.userId);
    if (!user) {
        throw new Error('User not found');
    }

    // Generate new token pair
    return generateTokenPair(user, ip, userAgent);
}

/**
 * Logout - revoke refresh token and blacklist access token
 */
export async function logout(
    accessToken: string,
    refreshTokenValue?: string
): Promise<void> {
    // Decode access token to get expiry
    try {
        const decoded = jwt.decode(accessToken) as { exp?: number };
        if (decoded?.exp) {
            const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
            if (expiresIn > 0) {
                await blacklistToken(accessToken, expiresIn);
            }
        }
    } catch {
        // Ignore decode errors
    }

    // Revoke refresh token if provided
    if (refreshTokenValue) {
        const { refreshTokens } = getCollections();
        await refreshTokens.updateOne(
            { token: refreshTokenValue },
            { $set: { revokedAt: new Date() } }
        );
    }
}

/**
 * Verify JWT token
 */
export function verifyAccessToken(token: string): JwtPayload {
    try {
        return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new Error('Token expired');
        }
        throw new Error('Invalid token');
    }
}

// ============================================
// TWO-FACTOR AUTHENTICATION
// ============================================

interface TwoFactorSetup {
    secret: string;
    otpauthUrl: string;
    qrCodeDataUrl: string;
}

/**
 * Generate 2FA secret and QR code
 */
export async function generate2FASecret(user: User): Promise<TwoFactorSetup> {
    const secret = speakeasy.generateSecret({
        name: `NeuralTrade:${user.email}`,
        issuer: 'NeuralTrade',
        length: 32,
    });

    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);

    return {
        secret: secret.base32,
        otpauthUrl: secret.otpauth_url!,
        qrCodeDataUrl,
    };
}

/**
 * Verify 2FA code
 */
export function verify2FACode(secret: string, code: string): boolean {
    return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: code,
        window: 1, // Allow 1 step tolerance
    });
}

/**
 * Enable 2FA for user
 */
export async function enable2FA(userId: string, secret: string, code: string): Promise<boolean> {
    // Verify the code first
    if (!verify2FACode(secret, code)) {
        return false;
    }

    const { users } = getCollections();
    await users.updateOne(
        { _id: new ObjectId(userId) as unknown as string },
        {
            $set: {
                twoFactorEnabled: true,
                twoFactorSecret: secret,
                updatedAt: new Date(),
            },
        }
    );

    log.info({ userId }, '2FA enabled');
    return true;
}

/**
 * Disable 2FA for user
 */
export async function disable2FA(userId: string): Promise<void> {
    const { users } = getCollections();
    await users.updateOne(
        { _id: new ObjectId(userId) as unknown as string },
        {
            $set: {
                twoFactorEnabled: false,
                updatedAt: new Date(),
            },
            $unset: {
                twoFactorSecret: '',
            },
        }
    );

    log.info({ userId }, '2FA disabled');
}

// ============================================
// EMAIL VERIFICATION
// ============================================

/**
 * Verify user email with token
 */
export async function verifyEmail(token: string): Promise<boolean> {
    const { users } = getCollections();

    // Find user with this verification token
    const user = await users.findOne({
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
        return false;
    }

    // Update user to verified
    await users.updateOne(
        { _id: user._id },
        {
            $set: {
                emailVerified: true,
                updatedAt: new Date(),
            },
            $unset: {
                emailVerificationToken: '',
                emailVerificationExpires: '',
            },
        }
    );

    log.info({ userId: user._id.toString() }, 'Email verified');
    return true;
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
    const { users } = getCollections();

    const user = await users.findOne({ email: email.toLowerCase() });

    if (!user) {
        // Don't reveal if user exists
        return { success: true, message: 'If the email exists, a verification link has been sent.' };
    }

    if (user.emailVerified) {
        return { success: false, message: 'Email is already verified.' };
    }

    // Generate new verification token
    const emailVerificationToken = generateRefreshToken();
    const emailVerificationExpires = new Date();
    emailVerificationExpires.setHours(emailVerificationExpires.getHours() + EMAIL_VERIFICATION_EXPIRY_HOURS);

    await users.updateOne(
        { _id: user._id },
        {
            $set: {
                emailVerificationToken,
                emailVerificationExpires,
                updatedAt: new Date(),
            },
        }
    );

    // Send verification email
    try {
        await publishEmailVerification(email.toLowerCase(), emailVerificationToken);
        log.info({ email }, 'Verification email resent');
    } catch (err) {
        log.error({ err, email }, 'Failed to resend verification email');
        return { success: false, message: 'Failed to send verification email. Please try again.' };
    }

    return { success: true, message: 'Verification email sent. Please check your inbox.' };
}

/**
 * Generate password reset token
 */
export async function generatePasswordResetToken(email: string): Promise<{ success: boolean; message: string }> {
    const { users } = getCollections();

    const user = await users.findOne({ email: email.toLowerCase() });

    if (!user) {
        // Don't reveal if user exists - security best practice
        return { success: true, message: 'If the email exists, a password reset link has been sent.' };
    }

    // Generate reset token
    const passwordResetToken = generateRefreshToken();
    const passwordResetExpires = new Date();
    passwordResetExpires.setHours(passwordResetExpires.getHours() + 1); // 1 hour expiry

    await users.updateOne(
        { _id: user._id },
        {
            $set: {
                passwordResetToken,
                passwordResetExpires,
                updatedAt: new Date(),
            },
        }
    );

    // Send password reset email via RabbitMQ
    try {
        const { publishPasswordReset } = await import('./rabbitmq.js');
        await publishPasswordReset(email.toLowerCase(), passwordResetToken);
        log.info({ email }, 'Password reset email queued');
    } catch (err) {
        log.error({ err, email }, 'Failed to queue password reset email');
        return { success: false, message: 'Failed to send reset email. Please try again.' };
    }

    return { success: true, message: 'If the email exists, a password reset link has been sent.' };
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
    const { users } = getCollections();

    // Find user with this reset token
    const user = await users.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
        return false;
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password and clear reset token
    await users.updateOne(
        { _id: user._id },
        {
            $set: {
                passwordHash,
                updatedAt: new Date(),
            },
            $unset: {
                passwordResetToken: '',
                passwordResetExpires: '',
            },
        }
    );

    // Invalidate all refresh tokens for security
    const { refreshTokens } = getCollections();
    await refreshTokens.updateMany(
        { userId: user._id.toString(), revokedAt: { $exists: false } },
        { $set: { revokedAt: new Date() } }
    );

    log.info({ userId: user._id.toString() }, 'Password reset successful');
    return true;
}

