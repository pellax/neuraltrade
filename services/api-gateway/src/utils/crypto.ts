/**
 * Cryptography Utilities
 * AES-256-GCM encryption for API keys and sensitive data
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { env } from './env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

// Derive key from environment secret
const deriveKey = (salt: Buffer): Buffer => {
    const keyHex = env.AES_ENCRYPTION_KEY;
    const keyBuffer = Buffer.from(keyHex, 'hex');
    return scryptSync(keyBuffer, salt, 32);
};

export interface EncryptedData {
    /**
     * Initialization vector (hex encoded)
     */
    iv: string;
    /**
     * Encrypted content (hex encoded)
     */
    content: string;
    /**
     * Authentication tag (hex encoded)
     */
    authTag: string;
    /**
     * Salt for key derivation (hex encoded)
     */
    salt: string;
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * @param plaintext - Data to encrypt
 * @returns EncryptedData object with iv, content, and authTag
 */
export function encrypt(plaintext: string): EncryptedData {
    const salt = randomBytes(SALT_LENGTH);
    const key = deriveKey(salt);
    const iv = randomBytes(IV_LENGTH);

    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
        iv: iv.toString('hex'),
        content: encrypted,
        authTag: authTag.toString('hex'),
        salt: salt.toString('hex'),
    };
}

/**
 * Decrypt AES-256-GCM encrypted data
 * @param data - EncryptedData object
 * @returns Decrypted plaintext
 */
export function decrypt(data: EncryptedData): string {
    const salt = Buffer.from(data.salt, 'hex');
    const key = deriveKey(salt);
    const iv = Buffer.from(data.iv, 'hex');
    const authTag = Buffer.from(data.authTag, 'hex');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(data.content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Encrypt API key pair for storage
 */
export function encryptApiKey(apiKey: string, apiSecret: string): string {
    const payload = JSON.stringify({ apiKey, apiSecret });
    const encrypted = encrypt(payload);
    return Buffer.from(JSON.stringify(encrypted)).toString('base64');
}

/**
 * Decrypt API key pair
 */
export function decryptApiKey(encryptedString: string): { apiKey: string; apiSecret: string } {
    const encrypted: EncryptedData = JSON.parse(
        Buffer.from(encryptedString, 'base64').toString('utf8')
    );
    const decrypted = decrypt(encrypted);
    return JSON.parse(decrypted);
}

/**
 * Generate a random token
 */
export function generateToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
}

/**
 * Generate a random refresh token
 */
export function generateRefreshToken(): string {
    return generateToken(64);
}
