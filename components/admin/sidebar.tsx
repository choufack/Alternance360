'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Users,
    FileText,
    BookOpen,
    Store,
    Wrench,
    Settings,
    GraduationCap,
    BarChart3,
    Shield,
    ClipboardCheck,
    Briefcase
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SignOutButton } from '@/components/auth/sign-out-button'

const navigation = [
    { name: 'Tableau de bord', href: '/admin', icon: LayoutDashboard },
    { name: 'Portail Audit', href: '/admin/audit', icon: ClipboardCheck },
    { name: 'Gestion Rôles', href: '/admin/settings/roles', icon: Shield },
    { name: 'Supervision Flux', href: '/admin/supervision', icon: BarChart3 },
    { name: 'Utilisateurs', href: '/admin/users', icon: Users },
    { name: 'Contrats', href: '/admin/contracts', icon: FileText },
    { name: 'Suivi Apprentis', href: '/admin/suivi', icon: GraduationCap },
    { name: 'Atelier', href: '/admin/referentiels', icon: Wrench },
    { name: 'Offres de Formation', href: '/admin/offres', icon: Briefcase },
    { name: 'Filières', href: '/admin/filieres', icon: Store },
    { name: 'Promotions', href: '/admin/promotions', icon: Users },
    { name: 'Marketplace', href: '/admin/marketplace', icon: Store },
    { name: 'Configuration', href: '/admin/settings', icon: Settings },
]

export function AdminSidebar() {
    const pathname = usePathname()

    return (
        <div className="flex flex-col h-full bg-white text-slate-600 w-72 border-r border-slate-200">
            <div className="p-8 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                    <BookOpen size={24} />
                </div>
                <div>
                    <h1 className="text-slate-900 font-black tracking-tight leading-none">CFA Admin</h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Alternance 360</p>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1 overflow-y-auto scrollbar-hide py-4">
                {navigation.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 group",
                                isActive
                                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                                    : "hover:bg-slate-100 hover:text-slate-900"
                            )}
                        >
                            <item.icon size={20} className={cn(
                                "transition-colors",
                                isActive ? "text-white" : "text-slate-400 group-hover:text-emerald-600"
                            )} />
                            {item.name}
                        </Link>
                    )
                })}
            </nav>

            <div className="p-4 mt-auto border-t border-slate-100">
                <SignOutButton className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all font-bold" />
            </div>
        </div>
    )
}
