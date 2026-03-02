'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Building2,
    Users,
    Inbox,
    Settings,
    ShieldCheck,
    BarChart3,
    BookOpen,
    CreditCard,
    Store,
    Wrench,
    Shield,
    ClipboardCheck,
    FileText,
    PieChart,
    Globe,
    MessageSquare
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SignOutButton } from '@/components/auth/sign-out-button'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

// Updated Navigation Structure with Coherent Blocks
const navigation = [
    { name: 'Vue d\'ensemble', href: '/super-admin', icon: LayoutDashboard },
    {
        name: 'Gestion Réseau',
        icon: Globe,
        children: [
            { name: 'Tenants (CFA)', href: '/super-admin/tenants', icon: Building2 },
            { name: 'Leads entrants', href: '/super-admin/leads', icon: Inbox },
            { name: 'Support Center', href: '/super-admin/support', icon: MessageSquare },
            { name: 'Tableau de Bord CFA', href: '/admin', icon: LayoutDashboard },
        ]
    },
    {
        name: 'Catalogue Offre',
        icon: BookOpen,
        children: [
            { name: 'Bibliothèque RNCP', href: '/super-admin/referentiels', icon: FileText },
            { name: 'Atelier', href: '/admin/referentiels', icon: Wrench },
        ]
    },
    {
        name: 'Audit & Finance',
        icon: PieChart,
        children: [
            { name: 'Portail Audit', href: '/admin/audit', icon: ClipboardCheck },
            { name: 'Journaux d\'Audit', href: '/super-admin/audit', icon: ShieldCheck },
            { name: 'Facturation & Plans', href: '/super-admin/billing', icon: CreditCard },
            { name: 'Rapports & Stats', href: '/super-admin/reports', icon: BarChart3 },
        ]
    },
    {
        name: 'Configuration',
        icon: Settings,
        children: [
            { name: 'Paramètres Généraux', href: '/super-admin/config', icon: Settings },
            { name: 'Gestion Rôles', href: '/admin/settings/roles', icon: Shield },
            { name: 'Utilisateurs Globaux', href: '/super-admin/users', icon: Users },
        ]
    }
]

export function SuperAdminSidebar() {
    const pathname = usePathname()
    const [hasMounted, setHasMounted] = React.useState(false)

    React.useEffect(() => {
        setHasMounted(true)
    }, [])

    // Determine default open value based on active path
    const defaultOpen = navigation
        .filter(item => item.children?.some(child => pathname.startsWith(child.href)))
        .map(item => item.name)

    if (!hasMounted) {
        return (
            <div className="flex flex-col h-full bg-slate-900 text-slate-300 w-72 border-r border-slate-800">
                <div className="p-8 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h1 className="text-white font-black tracking-tight leading-none">SUPER ADMIN</h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Alternance 360</p>
                    </div>
                </div>
                <div className="flex-1 px-4 space-y-4 py-4 animate-pulse">
                    <div className="h-10 bg-slate-800 rounded-xl w-full" />
                    <div className="h-10 bg-slate-800 rounded-xl w-full" />
                    <div className="h-10 bg-slate-800 rounded-xl w-full" />
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-slate-900 text-slate-300 w-72 border-r border-slate-800">
            <div className="p-8 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <ShieldCheck size={24} />
                </div>
                <div>
                    <h1 className="text-white font-black tracking-tight leading-none">SUPER ADMIN</h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Alternance 360</p>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1 overflow-y-auto scrollbar-hide py-4">
                <Accordion type="multiple" defaultValue={defaultOpen.length > 0 ? defaultOpen : ['Gestion Réseau']} className="space-y-1">
                    {navigation.map((item) => {
                        const hasChildren = item.children && item.children.length > 0

                        if (hasChildren) {
                            return (
                                <AccordionItem value={item.name} key={item.name} className="border-none">
                                    <AccordionTrigger className={cn(
                                        "flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 hover:bg-slate-800 hover:text-white hover:no-underline",
                                        // Check if any child is active to highlight parent
                                        item.children?.some(child => pathname.startsWith(child.href)) ? "text-white bg-slate-800/50" : "text-slate-500"
                                    )}>
                                        <div className="flex items-center gap-3 flex-1 text-left">
                                            <item.icon size={20} />
                                            {item.name}
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-0 pt-1 space-y-1">
                                        {item.children?.map(child => {
                                            const isChildActive = pathname === child.href
                                            return (
                                                <Link
                                                    key={child.href}
                                                    href={child.href}
                                                    className={cn(
                                                        "flex items-center gap-3 px-4 py-2.5 ml-4 rounded-xl text-xs font-bold transition-all duration-200",
                                                        isChildActive
                                                            ? "bg-blue-600/10 text-blue-400 border border-blue-600/20"
                                                            : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                                                    )}
                                                >
                                                    <child.icon size={16} />
                                                    {child.name}
                                                </Link>
                                            )
                                        })}
                                    </AccordionContent>
                                </AccordionItem>
                            )
                        }

                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                        return (
                            <Link
                                key={item.href || item.name}
                                href={item.href ?? '#'}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 group",
                                    isActive
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                        : "hover:bg-slate-800 hover:text-white"
                                )}
                            >
                                <item.icon size={20} className={cn(
                                    "transition-colors",
                                    isActive ? "text-white" : "text-slate-500 group-hover:text-blue-400"
                                )} />
                                {item.name}
                            </Link>
                        )
                    })}
                </Accordion>
            </nav>

            <div className="p-4 mt-auto border-t border-slate-800">
                <div className="bg-slate-800/50 rounded-2xl p-4 mb-4">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Système Live</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Instance: Production-01</p>
                </div>
                <SignOutButton className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all font-bold" />
            </div>
        </div>
    )
}
