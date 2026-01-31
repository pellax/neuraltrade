/*
 * QA Sentinel - Test Helpers & Utilities
 * 
 * Colección de helpers reutilizables para testing en NeuralTrade.
 * Importar en tests para reducir boilerplate.
 */

// ============================================================================
// TEST USER FACTORIES
// ============================================================================

import { faker } from '@faker-js/faker';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

interface CreateUserOptions {
    email?: string;
    password?: string;
    verified?: boolean;
    role?: 'user' | 'admin';
}

/**
 * Crea un usuario de prueba en la base de datos.
 * Genera datos aleatorios por defecto para evitar colisiones.
 */
export async function createTestUser(options: CreateUserOptions = {}) {
    const {
        email = faker.internet.email(),
        password = 'TestPassword123!',
        verified = true,
        role = 'user',
    } = options;

    const user = await prisma.user.create({
        data: {
            email,
            passwordHash: await hashPassword(password),
            emailVerified: verified,
            role,
        },
    });

    return { ...user, password }; // Include plain password for login tests
}

/**
 * Genera un JWT válido para autenticación en tests.
 */
export function generateAuthToken(
    user: { id: string; email: string },
    options: { expiresIn?: string } = {}
) {
    const { expiresIn = '1h' } = options;

    return jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn }
    );
}

// ============================================================================
// BALANCE & TRADING FIXTURES
// ============================================================================

/**
 * Seed balance para un usuario de prueba.
 */
export async function seedBalance(
    userId: string,
    asset: string,
    amount: number
) {
    return prisma.balance.upsert({
        where: { userId_asset: { userId, asset } },
        update: { available: amount, reserved: 0 },
        create: { userId, asset, available: amount, reserved: 0 },
    });
}

/**
 * Crea una orden válida de prueba.
 */
export function createValidOrderRequest(overrides: Partial<OrderRequest> = {}): OrderRequest {
    return {
        symbol: 'BTC/USDT',
        side: 'buy',
        type: 'limit',
        quantity: faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 3 }),
        price: faker.number.float({ min: 40000, max: 60000, fractionDigits: 2 }),
        ...overrides,
    };
}

interface OrderRequest {
    symbol: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit' | 'stop';
    quantity: number;
    price?: number;
}

/**
 * Genera casos de órdenes inválidas para testing paramétrico.
 */
export function invalidOrderCases(): Array<{ name: string; data: Partial<OrderRequest> }> {
    return [
        { name: 'missing symbol', data: { side: 'buy', quantity: 0.1 } },
        { name: 'empty symbol', data: { symbol: '', side: 'buy', quantity: 0.1 } },
        { name: 'invalid symbol format', data: { symbol: 'BTCUSDT', side: 'buy', quantity: 0.1 } },
        { name: 'missing side', data: { symbol: 'BTC/USDT', quantity: 0.1 } },
        { name: 'invalid side', data: { symbol: 'BTC/USDT', side: 'invalid' as any, quantity: 0.1 } },
        { name: 'negative quantity', data: { symbol: 'BTC/USDT', side: 'buy', quantity: -0.1 } },
        { name: 'zero quantity', data: { symbol: 'BTC/USDT', side: 'buy', quantity: 0 } },
        { name: 'NaN quantity', data: { symbol: 'BTC/USDT', side: 'buy', quantity: NaN } },
        { name: 'string quantity', data: { symbol: 'BTC/USDT', side: 'buy', quantity: 'abc' as any } },
        { name: 'negative price', data: { symbol: 'BTC/USDT', side: 'buy', quantity: 0.1, price: -100 } },
        { name: 'limit without price', data: { symbol: 'BTC/USDT', side: 'buy', type: 'limit', quantity: 0.1 } },
    ];
}

// ============================================================================
// MOCK FACTORIES
// ============================================================================

import { vi } from 'vitest';

/**
 * Crea mocks frescos para servicios de trading.
 * Usar en beforeEach para evitar state compartido.
 */
export function createTradingMocks() {
    return {
        orderRepo: {
            save: vi.fn().mockResolvedValue(undefined),
            findById: vi.fn().mockResolvedValue(null),
            findByUserId: vi.fn().mockResolvedValue([]),
            update: vi.fn().mockResolvedValue(undefined),
        },
        balanceService: {
            getBalance: vi.fn().mockResolvedValue({ available: 10000, reserved: 0 }),
            reserveBalance: vi.fn().mockResolvedValue(undefined),
            releaseReservation: vi.fn().mockResolvedValue(undefined),
            deductBalance: vi.fn().mockResolvedValue(undefined),
        },
        exchangeClient: {
            placeOrder: vi.fn().mockResolvedValue({ id: 'mock-external-id', status: 'open' }),
            cancelOrder: vi.fn().mockResolvedValue({ success: true }),
            getOrderStatus: vi.fn().mockResolvedValue({ status: 'open', filled: 0 }),
        },
        eventBus: {
            publish: vi.fn().mockResolvedValue(undefined),
            subscribe: vi.fn(),
        },
    };
}

/**
 * Mock de exchange que simula diferentes escenarios.
 */
export function createExchangeMock(scenario: 'success' | 'timeout' | 'reject' | 'rate_limit') {
    const mock = {
        placeOrder: vi.fn(),
        cancelOrder: vi.fn(),
    };

    switch (scenario) {
        case 'success':
            mock.placeOrder.mockResolvedValue({ id: 'ext-123', status: 'open' });
            mock.cancelOrder.mockResolvedValue({ success: true });
            break;
        case 'timeout':
            mock.placeOrder.mockRejectedValue(new Error('ETIMEDOUT'));
            break;
        case 'reject':
            mock.placeOrder.mockRejectedValue(new Error('Order rejected: Insufficient funds'));
            break;
        case 'rate_limit':
            mock.placeOrder.mockRejectedValue(new Error('Rate limit exceeded'));
            break;
    }

    return mock;
}

// ============================================================================
// DATABASE UTILITIES
// ============================================================================

/**
 * Limpia todas las tablas de testing.
 * Usar en beforeAll o afterAll.
 */
export async function cleanTestDatabase() {
    await prisma.$transaction([
        prisma.trade.deleteMany(),
        prisma.order.deleteMany(),
        prisma.balance.deleteMany(),
        prisma.apiKey.deleteMany(),
        prisma.user.deleteMany(),
    ]);
}

/**
 * Seed datos completos para E2E tests.
 */
export async function seedE2EData() {
    const user = await createTestUser({
        email: 'e2e-test@neuraltrade.io',
        password: 'E2ETestPassword123!',
        verified: true,
    });

    await seedBalance(user.id, 'USDT', 50000);
    await seedBalance(user.id, 'BTC', 1);

    return user;
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Verifica que un error tiene el código esperado.
 */
export function expectErrorCode(response: any, code: string) {
    expect(response.body).toMatchObject({
        success: false,
        error: { code },
    });
}

/**
 * Verifica estructura de respuesta exitosa.
 */
export function expectSuccess(response: any, dataShape: object) {
    expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining(dataShape),
    });
}

/**
 * Espera que una promesa se resuelva dentro de un timeout.
 */
export async function expectResolveWithin(
    promise: Promise<any>,
    timeoutMs: number,
    message = 'Promise did not resolve in time'
) {
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(message)), timeoutMs)
    );

    await expect(Promise.race([promise, timeout])).resolves.not.toThrow();
}

// ============================================================================
// TIMING UTILITIES
// ============================================================================

/**
 * Mide el tiempo de ejecución de una función async.
 */
export async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
    const start = performance.now();
    const result = await fn();
    const durationMs = performance.now() - start;
    return { result, durationMs };
}

/**
 * Retry una función hasta que pase o se agoten intentos.
 * Útil para tests que dependen de eventual consistency.
 */
export async function retryUntil<T>(
    fn: () => Promise<T>,
    predicate: (result: T) => boolean,
    options: { maxAttempts?: number; delayMs?: number } = {}
): Promise<T> {
    const { maxAttempts = 5, delayMs = 100 } = options;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const result = await fn();
        if (predicate(result)) return result;
        if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    throw new Error(`Condition not met after ${maxAttempts} attempts`);
}

// ============================================================================
// PLAYWRIGHT PAGE OBJECTS
// ============================================================================

import { Page, Locator } from '@playwright/test';

/**
 * Base Page Object con helpers comunes.
 */
export class BasePage {
    constructor(protected page: Page) { }

    async waitForNetworkIdle() {
        await this.page.waitForLoadState('networkidle');
    }

    async waitForToast(text: string) {
        await this.page.locator('[role="alert"]', { hasText: text }).waitFor();
    }

    async screenshot(name: string) {
        await this.page.screenshot({ path: `./screenshots/${name}.png` });
    }
}

/**
 * Login Page Object.
 */
export class LoginPage extends BasePage {
    readonly emailInput: Locator;
    readonly passwordInput: Locator;
    readonly submitButton: Locator;
    readonly errorMessage: Locator;

    constructor(page: Page) {
        super(page);
        this.emailInput = page.getByTestId('email-input');
        this.passwordInput = page.getByTestId('password-input');
        this.submitButton = page.getByTestId('login-submit');
        this.errorMessage = page.getByTestId('login-error');
    }

    async goto() {
        await this.page.goto('/login');
    }

    async login(email: string, password: string) {
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);
        await this.submitButton.click();
        await this.waitForNetworkIdle();
    }
}

/**
 * Trading Page Object.
 */
export class TradingPage extends BasePage {
    readonly pairSelector: Locator;
    readonly orderTypeSelector: Locator;
    readonly quantityInput: Locator;
    readonly priceInput: Locator;
    readonly buyButton: Locator;
    readonly sellButton: Locator;
    readonly orderConfirmation: Locator;
    readonly openOrdersTable: Locator;

    constructor(page: Page) {
        super(page);
        this.pairSelector = page.getByTestId('pair-selector');
        this.orderTypeSelector = page.getByTestId('order-type-selector');
        this.quantityInput = page.getByTestId('quantity-input');
        this.priceInput = page.getByTestId('price-input');
        this.buyButton = page.getByTestId('buy-button');
        this.sellButton = page.getByTestId('sell-button');
        this.orderConfirmation = page.getByTestId('order-confirmation');
        this.openOrdersTable = page.getByTestId('open-orders-table');
    }

    async goto() {
        await this.page.goto('/trading');
    }

    async selectPair(pair: string) {
        await this.pairSelector.click();
        await this.page.getByRole('option', { name: pair }).click();
    }

    async selectOrderType(type: 'market' | 'limit' | 'stop') {
        await this.orderTypeSelector.click();
        await this.page.getByRole('option', { name: type, exact: true }).click();
    }

    async enterQuantity(quantity: string) {
        await this.quantityInput.fill(quantity);
    }

    async enterPrice(price: string) {
        await this.priceInput.fill(price);
    }

    async submitBuy() {
        await this.buyButton.click();
    }

    async submitSell() {
        await this.sellButton.click();
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    createTestUser,
    generateAuthToken,
    seedBalance,
    createValidOrderRequest,
    invalidOrderCases,
    createTradingMocks,
    createExchangeMock,
    cleanTestDatabase,
    seedE2EData,
    expectErrorCode,
    expectSuccess,
    expectResolveWithin,
    measureTime,
    retryUntil,
    BasePage,
    LoginPage,
    TradingPage,
};
