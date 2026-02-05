/**
 * Authentication Context
 * Manages user session state across the application
 */

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'user' | 'admin';
    subscription: 'free' | 'starter' | 'pro' | 'enterprise';
    twoFactorEnabled: boolean;
    emailVerified: boolean;
}

interface AuthState {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
    login: (email: string, password: string, twoFactorCode?: string) => Promise<{ success: boolean; requires2fa?: boolean; error?: string }>;
    register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

// Token storage helpers
const getAccessToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
};

const getRefreshToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
};

const setTokens = (accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
};

const clearTokens = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AuthState>({
        user: null,
        isLoading: true,
        isAuthenticated: false,
    });

    const router = useRouter();
    const pathname = usePathname();

    // Check authentication on mount
    useEffect(() => {
        checkAuth();
    }, []);

    // Redirect based on auth state
    useEffect(() => {
        if (state.isLoading) return;

        const isAuthPage = pathname?.startsWith('/auth');
        const isDashboardPage = pathname?.startsWith('/dashboard');

        if (!state.isAuthenticated && isDashboardPage) {
            router.push('/auth/login');
        }

        if (state.isAuthenticated && isAuthPage) {
            router.push('/dashboard');
        }
    }, [state.isAuthenticated, state.isLoading, pathname, router]);

    async function checkAuth() {
        const accessToken = getAccessToken();

        if (!accessToken) {
            setState({ user: null, isLoading: false, isAuthenticated: false });
            return;
        }

        try {
            // Validate token and get user info
            const response = await fetch(`${API_URL}/api/v1/auth/me`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (response.ok) {
                const { data } = await response.json();
                setState({ user: data, isLoading: false, isAuthenticated: true });
            } else if (response.status === 401) {
                // Try to refresh token
                const refreshed = await tryRefreshToken();
                if (!refreshed) {
                    clearTokens();
                    setState({ user: null, isLoading: false, isAuthenticated: false });
                }
            } else {
                clearTokens();
                setState({ user: null, isLoading: false, isAuthenticated: false });
            }
        } catch (error) {
            console.error('[Auth] Check auth error:', error);
            clearTokens();
            setState({ user: null, isLoading: false, isAuthenticated: false });
        }
    }

    async function tryRefreshToken(): Promise<boolean> {
        const refreshToken = getRefreshToken();
        if (!refreshToken) return false;

        try {
            const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            });

            if (response.ok) {
                const { data } = await response.json();
                setTokens(data.accessToken, data.refreshToken);
                await checkAuth();
                return true;
            }
        } catch (error) {
            console.error('[Auth] Refresh token error:', error);
        }

        return false;
    }

    async function login(
        email: string,
        password: string,
        twoFactorCode?: string
    ): Promise<{ success: boolean; requires2fa?: boolean; error?: string }> {
        try {
            const response = await fetch(`${API_URL}/api/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, twoFactorCode }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle error object or string
                const errorMsg = typeof data.error === 'object'
                    ? data.error?.message || 'Login failed'
                    : data.error || 'Login failed';
                return { success: false, error: errorMsg };
            }

            if (data.data?.requires2fa) {
                return { success: false, requires2fa: true };
            }

            // Store tokens - API returns accessToken directly in data.data
            const accessToken = data.data?.accessToken || data.data?.tokens?.accessToken;
            const refreshToken = data.data?.refreshToken || data.data?.tokens?.refreshToken || '';

            if (!accessToken) {
                return { success: false, error: 'No access token received' };
            }

            setTokens(accessToken, refreshToken);

            // Update state
            setState({
                user: data.data.user,
                isLoading: false,
                isAuthenticated: true,
            });

            return { success: true };
        } catch (error: any) {
            console.error('[Auth] Login error:', error);
            return { success: false, error: error.message || 'Network error' };
        }
    }

    async function register(data: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
    }): Promise<{ success: boolean; error?: string }> {
        try {
            const response = await fetch(`${API_URL}/api/v1/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                return { success: false, error: result.error || 'Registration failed' };
            }

            return { success: true };
        } catch (error: any) {
            console.error('[Auth] Register error:', error);
            return { success: false, error: error.message || 'Network error' };
        }
    }

    async function logout(): Promise<void> {
        const accessToken = getAccessToken();
        const refreshToken = getRefreshToken();

        try {
            if (accessToken) {
                await fetch(`${API_URL}/api/v1/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({ refreshToken }),
                });
            }
        } catch {
            // Ignore logout errors
        }

        clearTokens();
        setState({ user: null, isLoading: false, isAuthenticated: false });
        router.push('/auth/login');
    }

    async function refreshUser(): Promise<void> {
        await checkAuth();
    }

    return (
        <AuthContext.Provider
            value={{
                ...state,
                login,
                register,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// HOC for protected pages
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
    return function AuthenticatedComponent(props: P) {
        const { isAuthenticated, isLoading } = useAuth();
        const router = useRouter();

        useEffect(() => {
            if (!isLoading && !isAuthenticated) {
                router.push('/auth/login');
            }
        }, [isLoading, isAuthenticated, router]);

        if (isLoading) {
            return (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    background: 'var(--bg-base)',
                }}>
                    <div className="spinner" />
                </div>
            );
        }

        if (!isAuthenticated) {
            return null;
        }

        return <Component {...props} />;
    };
}
