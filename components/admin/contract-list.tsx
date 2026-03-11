'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Search,
    Calendar,
    User,
    BookOpen,
    Filter,
    CheckCircle2,
    Clock,
    Archive
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Contract {
    id: string
    startDate: Date
    endDate: Date
    status: string
    user: { fullName: string | null, email: string }
    formateur: { fullName: string | null } | null
    referentiel: { title: string, codeRncp: string } | null
}

export function ContractList({ contracts }: { contracts: Contract[] }) {
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED' | 'PENDING'>('ALL')

    const filtered = contracts.filter(c => {
        const matchesSearch =
            c.user.fullName?.toLowerCase().includes(search.toLowerCase()) ||
            c.user.email.toLowerCase().includes(search.toLowerCase()) ||
            c.referentiel?.title.toLowerCase().includes(search.toLowerCase())

        if (filter === 'ALL') return matchesSearch
        if (filter === 'ACTIVE') return matchesSearch && c.status === 'ACTIVE'
        if (filter === 'ARCHIVED') return matchesSearch && c.status === 'ARCHIVED'
        if (filter === 'PENDING') return matchesSearch && c.status === 'PENDING'
        return matchesSearch
    })

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 uppercase text-[10px] font-black tracking-widest px-3 py-1">Actif</Badge>
            case 'ARCHIVED':
                return <Badge className="bg-slate-100 text-slate-500 border-slate-200 uppercase text-[10px] font-black tracking-widest px-3 py-1">Archivé</Badge>
            case 'PENDING':
                return <Badge className="bg-amber-50 text-amber-600 border-amber-100 uppercase text-[10px] font-black tracking-widest px-3 py-1">En attente</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    return (
        <Card className="rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden bg-white">
            <CardHeader className="p-10 pb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">Liste des Contrats</CardTitle>
                        <p className="text-slate-500 font-medium tracking-tight">Consultez l'historique complet des parcours alternants.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                            <Input
                                placeholder="Rechercher un apprenti ou referentiel..."
                                className="pl-12 h-12 w-[300px] rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-emerald-500/20 transition-all font-medium"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                            {(['ALL', 'ACTIVE', 'PENDING', 'ARCHIVED'] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    {f === 'ALL' ? 'Tous' : f === 'ACTIVE' ? 'Actifs' : f === 'PENDING' ? 'Attente' : 'Archives'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 border-y border-slate-100">
                            <tr className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                                <th className="px-10 py-5">Apprenti</th>
                                <th className="px-10 py-5">Référentiel</th>
                                <th className="px-10 py-5">Période</th>
                                <th className="px-10 py-5">Tuteur/Formateur</th>
                                <th className="px-10 py-5 text-right">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center text-slate-300 font-medium italic">Aucun contrat trouvé.</td>
                                </tr>
                            ) : filtered.map(c => (
                                <tr key={c.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all">
                                                <User size={18} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 leading-tight">{c.user.fullName || "Inconnu"}</div>
                                                <div className="text-xs text-slate-400 font-medium">{c.user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-2 text-slate-600 font-bold">
                                            <BookOpen size={16} className="text-slate-300" />
                                            <span className="truncate max-w-[200px]">{c.referentiel?.title || "N/A"}</span>
                                        </div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{c.referentiel?.codeRncp}</div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-2 text-slate-600 font-medium text-sm">
                                            <Calendar size={16} className="text-slate-300" />
                                            <span>
                                                {format(new Date(c.startDate), 'MMM yyyy', { locale: fr })} - {format(new Date(c.endDate), 'MMM yyyy', { locale: fr })}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="text-sm font-bold text-slate-700">
                                            {c.formateur?.fullName || <span className="text-slate-300 font-medium">Non assigné</span>}
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        {getStatusBadge(c.status)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}
