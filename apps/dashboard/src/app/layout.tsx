import type { Metadata } from 'next';
import '@/styles/globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata: Metadata = {
    title: 'NeuralTrade | AI-Powered Algorithmic Trading',
    description: 'High-frequency algorithmic trading platform with AI/ML signal generation and risk management',
    keywords: ['trading', 'algorithmic trading', 'AI', 'cryptocurrency', 'backtesting'],
    authors: [{ name: 'NeuralTrade' }],
    themeColor: '#0a0e17',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>
                <AuthProvider>{children}</AuthProvider>
            </body>
        </html>
    );
}

