'use client'

import { ApprenticeProgressOverview } from '@/app/actions/supervision'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { User, Book, ExternalLink, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function ApprenticeProgressTracker({ data }: { data: ApprenticeProgressOverview[] }) {
    return (
        <Card className="rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 bg-white overflow-hidden">
            <CardHeader className="p-8 pb-4 border-b border-slate-50 relative bg-slate-50/50">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">Progression Pédagogique</CardTitle>
                        <p className="text-slate-500 font-medium">Suivi détaillé des acquisitions de compétences globales et croisées.</p>
                    </div>
                    <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 font-bold uppercase tracking-widest text-[10px] px-3 py-1">
                        Tableau de bord
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white border-b border-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                            <tr>
                                <th className="px-8 py-5">Apprenti / Parcours</th>
                                <th className="px-8 py-5 w-[20%] text-center">Global (CFA)</th>
                                <th className="px-8 py-5 w-[20%] text-center">Apprenti (Auto-éval)</th>
                                <th className="px-8 py-5 w-[20%] text-center">Tuteur (Entreprise)</th>
                                <th className="px-8 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-16 text-center text-slate-400 font-medium bg-slate-50/50">
                                        Aucun apprenti actif trouvé.
                                    </td>
                                </tr>
                            ) : data.map((item) => (
                                <tr key={item.contractId} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                                <User size={18} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">{item.apprenticeName}</div>
                                                <div className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                                    <Book size={12} className="text-slate-300" />
                                                    <span className="truncate max-w-[180px]">{item.referentielTitle}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* CFA Progress (Indicators) */}
                                    <td className="px-8 py-5 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-sm font-black text-slate-700">{item.cfaProgress}%</span>
                                            <Progress value={item.cfaProgress} className="h-2 w-24 bg-slate-100 [&>div]:bg-indigo-500" />
                                        </div>
                                    </td>

                                    {/* Apprentice Progress (Self-eval) */}
                                    <td className="px-8 py-5 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-sm font-black text-slate-700">{item.apprenticeProgress}%</span>
                                            <Progress value={item.apprenticeProgress} className="h-2 w-24 bg-slate-100 [&>div]:bg-sky-500" />
                                        </div>
                                    </td>

                                    {/* Tutor Progress */}
                                    <td className="px-8 py-5 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-sm font-black text-slate-700">{item.entrepriseProgress}%</span>
                                            <Progress value={item.entrepriseProgress} className="h-2 w-24 bg-slate-100 [&>div]:bg-emerald-500" />
                                        </div>
                                    </td>

                                    <td className="px-8 py-5 text-right">
                                        <Link href={`/admin/livret/${item.contractId}`} className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors">
                                            Livret <ExternalLink size={14} />
                                        </Link>
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
