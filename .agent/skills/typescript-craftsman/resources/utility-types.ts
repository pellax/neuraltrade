/**
 * NeuralTrade - Utility Types Library
 * 
 * Colección de utility types reutilizables para el proyecto.
 * Importar desde: @neuraltrade/shared-types/utils
 */

// ═══════════════════════════════════════════════════════════════
// BRANDED TYPES (Nominal Typing)
// ═══════════════════════════════════════════════════════════════

declare const __brand: unique symbol;

/**
 * Branded type - Añade tipado nominal a tipos estructurales.
 * Dos tipos con la misma estructura pero diferentes brands no son intercambiables.
 * 
 * @example
 * type UserId = Brand<string, 'UserId'>;
 * type OrderId = Brand<string, 'OrderId'>;
 * 
 * const userId: UserId = 'user-123' as UserId;
 * const orderId: OrderId = 'order-456' as OrderId;
 * 
 * function getUser(id: UserId) { ... }
 * getUser(orderId); // ❌ Error!
 */
export type Brand<T, B extends string> = T & { readonly [__brand]: B };

/**
 * Extrae el tipo base de un branded type
 */
export type Unbrand<T> = T extends Brand<infer U, string> ? U : T;

// ═══════════════════════════════════════════════════════════════
// OBJECT MANIPULATION
// ═══════════════════════════════════════════════════════════════

/**
 * Hace propiedades específicas requeridas, resto opcional
 */
export type RequireOnly<T, K extends keyof T> =
    Required<Pick<T, K>> & Partial<Omit<T, K>>;

/**
 * Hace propiedades específicas opcionales, resto requerido
 */
export type PartialBy<T, K extends keyof T> =
    Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Hace todas las propiedades requeridas excepto las especificadas
 */
export type RequiredExcept<T, K extends keyof T> =
    Required<Omit<T, K>> & Pick<T, K>;

/**
 * Excluye propiedades que son de cierto tipo
 */
export type OmitByType<T, V> = {
    [K in keyof T as T[K] extends V ? never : K]: T[K];
};

/**
 * Incluye solo propiedades que son de cierto tipo
 */
export type PickByType<T, V> = {
    [K in keyof T as T[K] extends V ? K : never]: T[K];
};

/**
 * Keys de un objeto que son de cierto tipo
 */
export type KeysOfType<T, V> = {
    [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

/**
 * Convierte todas las propiedades a optional + nullable
 */
export type Nullable<T> = { [K in keyof T]?: T[K] | null };

/**
 * Deep Partial - hace todas las propiedades y sub-propiedades opcionales
 */
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Deep Readonly - hace todas las propiedades y sub-propiedades readonly
 */
export type DeepReadonly<T> = {
    readonly [P in keyof T]: T[P] extends object
    ? T[P] extends Function
    ? T[P]
    : DeepReadonly<T[P]>
    : T[P];
};

/**
 * Deep Required - hace todas las propiedades y sub-propiedades requeridas
 */
export type DeepRequired<T> = {
    [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

// ═══════════════════════════════════════════════════════════════
// UNION MANIPULATION
// ═══════════════════════════════════════════════════════════════

/**
 * Extrae tipos de un union que extienden cierto tipo
 */
export type ExtractByType<T, U> = T extends U ? T : never;

/**
 * Excluye tipos de un union que extienden cierto tipo
 */
export type ExcludeByType<T, U> = T extends U ? never : T;

/**
 * Union a Intersection
 */
export type UnionToIntersection<U> =
    (U extends unknown ? (x: U) => void : never) extends (x: infer I) => void
    ? I
    : never;

/**
 * Último elemento de un union (para iterar)
 */
export type LastOfUnion<T> =
    UnionToIntersection<T extends unknown ? () => T : never> extends () => infer R
    ? R
    : never;

// ═══════════════════════════════════════════════════════════════
// FUNCTION TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Tipo de retorno unwrapped de Promise
 */
export type Awaited<T> = T extends Promise<infer U>
    ? Awaited<U>
    : T;

/**
 * Convierte una función en async
 */
export type Async<F extends (...args: any[]) => any> =
    (...args: Parameters<F>) => Promise<Awaited<ReturnType<F>>>;

/**
 * Extrae el tipo del primer parámetro
 */
export type FirstParameter<F extends (...args: any[]) => any> =
    Parameters<F>[0];

/**
 * Función con this tipado
 */
export type BoundFunction<This, F extends (...args: any[]) => any> =
    (this: This, ...args: Parameters<F>) => ReturnType<F>;

/**
 * Constructor type
 */
export type Constructor<T = unknown> = new (...args: any[]) => T;

/**
 * Tipo que puede ser el valor o una función que retorna el valor
 */
export type MaybeGetter<T> = T | (() => T);

// ═══════════════════════════════════════════════════════════════
// ARRAY TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Extrae el tipo de elementos de un array
 */
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

/**
 * Tuple con al menos un elemento
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Array de longitud fija
 */
export type FixedLengthArray<T, N extends number> = N extends N
    ? number extends N
    ? T[]
    : _FixedLengthArray<T, N, []>
    : never;

type _FixedLengthArray<T, N extends number, R extends unknown[]> =
    R['length'] extends N
    ? R
    : _FixedLengthArray<T, N, [T, ...R]>;

/**
 * Head y Tail de un tuple
 */
export type Head<T extends any[]> = T extends [infer H, ...any[]] ? H : never;
export type Tail<T extends any[]> = T extends [any, ...infer R] ? R : never;

// ═══════════════════════════════════════════════════════════════
// STRING LITERAL TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * CamelCase a kebab-case
 */
export type KebabCase<S extends string> = S extends `${infer C}${infer R}`
    ? C extends Uppercase<C>
    ? `-${Lowercase<C>}${KebabCase<R>}`
    : `${C}${KebabCase<R>}`
    : S;

/**
 * Paths de un objeto anidado como union de strings
 */
export type Paths<T, D extends number = 4> = [D] extends [never]
    ? never
    : T extends object
    ? {
        [K in keyof T]-?: K extends string | number
        ? `${K}` | Join<K, Paths<T[K], Prev[D]>>
        : never;
    }[keyof T]
    : never;

type Prev = [never, 0, 1, 2, 3, 4, ...0[]];
type Join<K, P> = P extends string | number
    ? `${K & (string | number)}${'' extends P ? '' : '.'}${P}`
    : never;

/**
 * Valor en un path anidado
 */
export type PathValue<T, P extends string> = P extends `${infer K}.${infer R}`
    ? K extends keyof T
    ? PathValue<T[K], R>
    : never
    : P extends keyof T
    ? T[P]
    : never;

// ═══════════════════════════════════════════════════════════════
// DISCRIMINATED UNIONS HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Extrae un variant de una discriminated union
 */
export type DiscriminateUnion<
    T,
    K extends keyof T,
    V extends T[K],
> = T extends Record<K, V> ? T : never;

/**
 * Helper para pattern matching exhaustivo
 */
export type MatchHandlers<T extends { type: string }> = {
    [K in T['type']]: (value: DiscriminateUnion<T, 'type', K>) => unknown;
};

// ═══════════════════════════════════════════════════════════════
// RESULT TYPE
// ═══════════════════════════════════════════════════════════════

/**
 * Result type para manejo explícito de errores
 */
export type Result<T, E extends Error = Error> =
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly error: E };

/**
 * Namespace con constructores y helpers de Result
 */
export const Result = {
    ok: <T>(value: T): Result<T, never> => ({ ok: true, value }),
    fail: <E extends Error>(error: E): Result<never, E> => ({ ok: false, error }),

    isOk: <T, E extends Error>(result: Result<T, E>): result is { ok: true; value: T } =>
        result.ok,

    isErr: <T, E extends Error>(result: Result<T, E>): result is { ok: false; error: E } =>
        !result.ok,

    map: <T, U, E extends Error>(
        result: Result<T, E>,
        fn: (value: T) => U,
    ): Result<U, E> => (result.ok ? Result.ok(fn(result.value)) : result),

    flatMap: <T, U, E extends Error>(
        result: Result<T, E>,
        fn: (value: T) => Result<U, E>,
    ): Result<U, E> => (result.ok ? fn(result.value) : result),

    mapError: <T, E extends Error, F extends Error>(
        result: Result<T, E>,
        fn: (error: E) => F,
    ): Result<T, F> => (result.ok ? result : Result.fail(fn(result.error))),

    unwrap: <T, E extends Error>(result: Result<T, E>): T => {
        if (result.ok) return result.value;
        throw result.error;
    },

    unwrapOr: <T, E extends Error>(result: Result<T, E>, defaultValue: T): T =>
        result.ok ? result.value : defaultValue,

    fromThrowable: <T, E extends Error = Error>(
        fn: () => T,
        errorMapper?: (e: unknown) => E,
    ): Result<T, E> => {
        try {
            return Result.ok(fn());
        } catch (e) {
            const error = errorMapper
                ? errorMapper(e)
                : ((e instanceof Error ? e : new Error(String(e))) as E);
            return Result.fail(error);
        }
    },

    fromPromise: async <T, E extends Error = Error>(
        promise: Promise<T>,
        errorMapper?: (e: unknown) => E,
    ): Promise<Result<T, E>> => {
        try {
            const value = await promise;
            return Result.ok(value);
        } catch (e) {
            const error = errorMapper
                ? errorMapper(e)
                : ((e instanceof Error ? e : new Error(String(e))) as E);
            return Result.fail(error);
        }
    },
} as const;

// ═══════════════════════════════════════════════════════════════
// OPTION TYPE
// ═══════════════════════════════════════════════════════════════

/**
 * Option type para valores que pueden no existir
 */
export type Option<T> =
    | { readonly some: true; readonly value: T }
    | { readonly some: false };

export const Option = {
    some: <T>(value: T): Option<T> => ({ some: true, value }),
    none: <T = never>(): Option<T> => ({ some: false }),

    isSome: <T>(option: Option<T>): option is { some: true; value: T } =>
        option.some,

    isNone: <T>(option: Option<T>): option is { some: false } =>
        !option.some,

    fromNullable: <T>(value: T | null | undefined): Option<T> =>
        value != null ? Option.some(value) : Option.none(),

    map: <T, U>(option: Option<T>, fn: (value: T) => U): Option<U> =>
        option.some ? Option.some(fn(option.value)) : Option.none(),

    flatMap: <T, U>(option: Option<T>, fn: (value: T) => Option<U>): Option<U> =>
        option.some ? fn(option.value) : Option.none(),

    unwrap: <T>(option: Option<T>): T => {
        if (option.some) return option.value;
        throw new Error('Attempted to unwrap None');
    },

    unwrapOr: <T>(option: Option<T>, defaultValue: T): T =>
        option.some ? option.value : defaultValue,
} as const;

// ═══════════════════════════════════════════════════════════════
// ASSERTION HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Assertion function type
 */
export type AssertFunction<T> = (value: unknown) => asserts value is T;

/**
 * Type guard function type
 */
export type TypeGuard<T> = (value: unknown) => value is T;

/**
 * Narrowing helper - asegura exhaustividad en switches
 */
export function assertNever(value: never, message?: string): never {
    throw new Error(message ?? `Unexpected value: ${JSON.stringify(value)}`);
}

/**
 * Assert que un valor no es null/undefined
 */
export function assertDefined<T>(
    value: T | null | undefined,
    message = 'Value is null or undefined',
): asserts value is T {
    if (value == null) {
        throw new Error(message);
    }
}
