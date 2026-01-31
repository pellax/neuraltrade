'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid verification link. Please check your email and try again.');
            return;
        }

        async function verifyEmail() {
            try {
                const response = await fetch(`${API_URL}/auth/verify-email/${token}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                const data = await response.json();

                if (data.success) {
                    setStatus('success');
                    setMessage(data.data.message || 'Email verified successfully!');
                    // Redirect to login after 3 seconds
                    setTimeout(() => {
                        router.push('/auth/login?verified=true');
                    }, 3000);
                } else {
                    setStatus('error');
                    setMessage(data.error?.message || 'Verification failed. The link may have expired.');
                }
            } catch (err) {
                setStatus('error');
                setMessage('An error occurred while verifying your email. Please try again later.');
            }
        }

        verifyEmail();
    }, [token, router]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="text-5xl mb-4">🧠</div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
                        NeuralTrade
                    </h1>
                    <p className="text-slate-400 mt-2">AI-Powered Trading Platform</p>
                </div>

                {/* Card */}
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
                    {status === 'loading' && (
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-6">
                                <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                            </div>
                            <h2 className="text-xl font-semibold text-white mb-2">Verifying Email</h2>
                            <p className="text-slate-400">Please wait while we verify your email address...</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-white mb-2">Email Verified!</h2>
                            <p className="text-slate-400 mb-6">{message}</p>
                            <p className="text-sm text-slate-500">Redirecting to login...</p>
                            <Link
                                href="/auth/login?verified=true"
                                className="inline-block mt-4 px-6 py-3 bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
                            >
                                Go to Login
                            </Link>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-white mb-2">Verification Failed</h2>
                            <p className="text-slate-400 mb-6">{message}</p>
                            <div className="space-y-3">
                                <Link
                                    href="/auth/login"
                                    className="inline-block w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity text-center"
                                >
                                    Back to Login
                                </Link>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="inline-block w-full px-6 py-3 bg-slate-700 text-white font-semibold rounded-lg hover:bg-slate-600 transition-colors"
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-slate-500 text-sm mt-6">
                    Need help? <a href="mailto:support@neuraltrade.io" className="text-cyan-400 hover:underline">Contact Support</a>
                </p>
            </div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
            </div>
        }>
            <VerifyEmailContent />
        </Suspense>
    );
}
