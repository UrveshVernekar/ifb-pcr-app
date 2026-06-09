// components/shared/Topbar.tsx
'use client';

import { Menu } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import ProfileDropdown from './ProfileDropdown';

interface TopbarProps {
    onToggleSidebar: () => void;
    collapsed: boolean;
}

export default function Topbar({ onToggleSidebar, collapsed }: TopbarProps) {
    return (
        <header className="h-16 border-b border-border bg-card/95 backdrop-blur-xl sticky top-0 z-50 flex-shrink-0">
            <div className="h-full px-6 flex items-center justify-between">
                {/* Left Side */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={onToggleSidebar}
                        className="md:hidden text-muted-foreground hover:text-foreground"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="hidden md:flex items-center gap-3">
                        <h1 className="text-lg font-semibold tracking-tight text-foreground">
                            IIOT Portal • AC Division
                        </h1>
                    </div>
                </div>

                {/* Right Side */}
                <div className="flex items-center gap-3">
                    <ThemeToggle />

                    {/* Vertical Divider */}
                    <div className="w-px h-8 bg-border mx-2 hidden md:block" />

                    <ProfileDropdown />
                </div>
            </div>
        </header>
    );
}