// components/shared/ProfileDropdown.tsx
'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, User } from 'lucide-react';

export default function ProfileDropdown() {
    const user = (() => {
        if (typeof window === 'undefined') return { name: 'User', role: 'Employee' };
        const loginData = sessionStorage.getItem('logindata');
        if (!loginData) return { name: 'User', role: 'Employee' };
        try {
            const parsed = JSON.parse(loginData);
            return { name: parsed?.name || 'User', role: parsed?.depart || 'Employee' };
        } catch {
            return { name: 'User', role: 'Employee' };
        }
    })();
    const tokens = user.name.split(' ').filter(Boolean);
    const initials = tokens.length === 0 ? 'U' : (tokens[0][0] + (tokens[1]?.[0] || '')).toUpperCase();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 cursor-pointer pl-2">
                    <div className="hidden sm:block text-right">
                        <div className="text-sm font-semibold text-foreground">{user.name}</div>
                        <div className="text-xs text-muted-foreground font-medium">{user.role}</div>
                    </div>
                    <Avatar className="h-9 w-9 border border-border flex-shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-sm">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card border border-border">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className="text-red-600 cursor-pointer focus:text-red-600"
                    onClick={() => {
                        localStorage.removeItem('isAuthenticated');
                        sessionStorage.clear();
                        window.location.href = '/login';
                    }}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
