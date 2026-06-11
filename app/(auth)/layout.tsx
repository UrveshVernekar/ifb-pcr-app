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

            {/* AMBIENT GLOW BLURS */}
            <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-blue-600/10 dark:bg-blue-500/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-indigo-600/10 dark:bg-indigo-500/5 blur-[120px] pointer-events-none" />

            <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center justify-center min-h-screen py-8 px-4">
                <div className="w-full flex justify-center animate-in fade-in zoom-in-95 duration-500">
                    {children}
                </div>

                {/* Enterprise Secure Footer */}
                {/* <footer className="mt-8 flex flex-col items-center justify-center gap-1.5 text-center select-none text-zinc-400 dark:text-zinc-500">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400 bg-zinc-100/50 dark:bg-zinc-900/40 px-2.5 py-1 rounded-full border border-zinc-200/50 dark:border-zinc-800/30 backdrop-blur-md">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0110 0v4" />
                        </svg>
                        Secure 256-bit SSL Encrypted Connection
                    </div>
                    <div className="text-[10px] font-medium mt-1">
                        © {new Date().getFullYear()} IFB Industries Ltd. All rights reserved.
                    </div>
                </footer> */}
            </div>
        </div>
    );
}