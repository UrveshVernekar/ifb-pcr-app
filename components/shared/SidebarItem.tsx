import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarItemProps {
    icon: LucideIcon;
    label: string;
    href: string;
    collapsed: boolean;
}

export default function SidebarItem({ icon: Icon, label, href, collapsed }: SidebarItemProps) {
    const pathname = usePathname();
    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));

    const linkContent = (
        <Link
            href={href}
            className={`flex items-center rounded-xl text-sm font-medium transition-all duration-200 group relative w-full ${collapsed ? 'justify-center py-3 px-2' : 'gap-3 px-4 py-3'
                } ${isActive
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
        >
            <Icon
                className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'group-hover:text-foreground'
                    }`}
            />
            {!collapsed && <span className="flex-1 truncate">{label}</span>}
            {isActive && !collapsed && (
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 ml-auto" />
            )}
        </Link>
    );

    if (collapsed) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    {linkContent}
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs font-semibold">
                    {label}
                </TooltipContent>
            </Tooltip>
        );
    }

    return linkContent;
}
