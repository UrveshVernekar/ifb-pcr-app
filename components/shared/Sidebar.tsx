import { useEffect, useState } from 'react';
import { Home, Factory, ChevronRight, ChevronLeft, Shield, ShieldCheck, Calendar, Gauge, Wrench, Users, Map, Building2, Store, CheckCircle, Database } from 'lucide-react';
import SidebarItem from './SidebarItem';
import Image from 'next/image';
import { TooltipProvider } from '@/components/ui/tooltip';

interface SidebarProps {
    collapsed: boolean;
    onCollapse: () => void;
}

const menuItems = [
    {
        label: 'Dashboard',
        icon: Home,
        href: '/dashboard'
    },
];

export default function Sidebar({ collapsed, onCollapse }: SidebarProps) {
    const [role, setRole] = useState<string | null>(null);

    useEffect(() => {
        const dataStr = sessionStorage.getItem('logindata');
        if (dataStr) {
            try {
                const data = JSON.parse(dataStr);
                setRole(data.role || null);
            } catch (e) {
                console.error('Failed to parse logindata in Sidebar:', e);
            }
        }
    }, []);

    const items = [...menuItems];
    if (role === 'ADMIN' || role === 'REGION_HEAD') {
        items.push({
            label: 'Regions',
            icon: Map,
            href: '/dashboard/regions'
        });
    }
    if (role === 'ADMIN' || role === 'REGION_HEAD' || role === 'BRANCH_HEAD') {
        items.push({
            label: 'Branches',
            icon: Building2,
            href: '/dashboard/branches'
        });
    }
    if (role === 'ADMIN' || role === 'REGION_HEAD' || role === 'BRANCH_HEAD' || role === 'FRANCHISE_HEAD') {
        items.push({
            label: 'Franchises',
            icon: Store,
            href: '/dashboard/franchises'
        });
    }
    if (role === 'ADMIN') {
        items.push({
            label: 'Validation',
            icon: CheckCircle,
            href: '/dashboard/validation'
        });
        items.push({
            label: 'File Upload',
            icon: Database,
            href: '/dashboard/crm-upload'
        });
    }
    if (role === 'ADMIN' || role === 'REGION_HEAD' || role === 'BRANCH_HEAD' || role === 'FRANCHISE_HEAD') {
        items.push({
            label: 'Physical Verification',
            icon: ShieldCheck,
            href: '/dashboard/physical-verification'
        });
    }
    if (role === 'ADMIN' || role === 'REGION_HEAD' || role === 'BRANCH_HEAD') {
        items.push({
            label: 'Users',
            icon: Users,
            href: '/dashboard/users'
        });
    }


    return (
        <TooltipProvider delayDuration={0}>
            {!collapsed && (
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
                    onClick={onCollapse}
                />
            )}
            <aside
                className={`fixed inset-y-0 left-0 md:relative md:flex flex-shrink-0 border-r border-border bg-card/95 backdrop-blur-xl h-full flex flex-col transition-all duration-300 ease-in-out z-50 ${collapsed
                    ? '-translate-x-full md:translate-x-0 md:w-16'
                    : 'translate-x-0 md:w-72 w-72'
                    }`}
            >
                {/* Collapse Toggle Button */}
                <button
                    onClick={onCollapse}
                    className="absolute -right-3 top-20 bg-background border border-border rounded-full p-1.5 text-muted-foreground hover:text-foreground shadow-md hover:shadow-lg transition-all z-20 focus:outline-none focus:ring-2 focus:ring-blue-500 md:block hidden"
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? (
                        <ChevronRight className="w-4 h-4" />
                    ) : (
                        <ChevronLeft className="w-4 h-4" />
                    )}
                </button>

                {/* Logo Section */}
                <div className={`h-16 flex items-center border-b border-border transition-all duration-300 ${collapsed ? 'justify-center px-0' : 'px-6'}`}>
                    <div className={`relative flex items-center justify-center transition-all duration-300 ${collapsed ? 'w-14 h-14' : 'w-55 h-10'}`}>
                        <Image
                            src="/images/IFB.png"
                            alt="IFB Logo"
                            fill
                            sizes={collapsed ? '56px' : '140px'}
                            className="object-contain dark:brightness-0 dark:invert"
                            priority
                        />
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto py-8 px-3">
                    <div
                        className={`text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 px-3 transition-all duration-300 ${collapsed ? 'opacity-0 h-0 overflow-hidden' : ''
                            }`}
                    >
                        Core Operations
                    </div>

                    <nav className="space-y-1">
                        {items.map((item) => (
                            <SidebarItem
                                key={item.href}
                                icon={item.icon}
                                label={item.label}
                                href={item.href}
                                collapsed={collapsed}
                            />
                        ))}
                    </nav>
                </div>
            </aside>
        </TooltipProvider>
    );
}