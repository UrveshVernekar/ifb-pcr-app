// app/(dashboard)/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/shared/Sidebar';
import Topbar from '@/components/shared/Topbar';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    useEffect(() => {
        const auth = localStorage.getItem('isAuthenticated');
        console.log("DashboardLayout useEffect - auth in localStorage:", auth);
        if (!auth) {
            console.log("DashboardLayout - NO auth! Redirecting to /login");
            router.replace('/login');
        } else {
            console.log("DashboardLayout - authenticated! Setting state...");
            const timer = setTimeout(() => {
                setIsAuthenticated(true);
                const saved = localStorage.getItem('sidebarCollapsed');
                if (saved !== null) {
                    setSidebarCollapsed(saved === 'true');
                } else if (window.innerWidth < 768) {
                    setSidebarCollapsed(true);
                }
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [router]);

    // Handle screen size responsiveness on mount and resize
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setSidebarCollapsed(true);
            } else {
                const saved = localStorage.getItem('sidebarCollapsed');
                if (saved !== null) {
                    setSidebarCollapsed(saved === 'true');
                } else {
                    setSidebarCollapsed(false);
                }
            }
        };
        const timer = setTimeout(() => {
            handleResize();
        }, 0);
        window.addEventListener('resize', handleResize);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Automatically collapse sidebar on mobile when route changes
    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            const timer = setTimeout(() => {
                setSidebarCollapsed(true);
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [pathname]);

    const toggleSidebar = () => {
        setSidebarCollapsed(prev => {
            const nextVal = !prev;
            localStorage.setItem('sidebarCollapsed', String(nextVal));
            return nextVal;
        });
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600" />
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden bg-background text-foreground">
            <Sidebar
                collapsed={sidebarCollapsed}
                onCollapse={toggleSidebar}
            />

            <div className="flex-1 flex flex-col overflow-hidden">
                <Topbar
                    onToggleSidebar={toggleSidebar}
                    collapsed={sidebarCollapsed}
                />

                <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-6 bg-background">
                    {children}
                </main>
            </div>
        </div>
    );
}