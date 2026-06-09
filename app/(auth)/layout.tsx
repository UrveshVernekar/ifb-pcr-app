// app/(auth)/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Auth - IFB IIOT',
    description: 'Manufacturing Management System',
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* BACKGROUND PATTERN */}
            <div className="absolute inset-0 bg-[radial-gradient(oklch(0.5_0.15_250/0.05)_1px,transparent_1px)] bg-[length:20px_20px] pointer-events-none" />
            <div className="relative z-10 w-full max-w-md flex justify-center">
                {children}
            </div>
        </div>
    );
}