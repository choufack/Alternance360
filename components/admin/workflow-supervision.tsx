'use client'

import { WorkflowStat } from '@/app/actions/supervision'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    CheckCircle2,
    Circle,
    ArrowRight,
    AlertCircle,
    User,
    Activity,
    Lock
} from 'lucide-react'

export function WorkflowSupervision({ stats }: { stats: WorkflowStat[] }) {
    return (
        <Card className="rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
            <CardHeader className="p-10 pb-6 bg-slate-50/50">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">Supervision des Flux Qualiopi 📊</CardTitle>
                        <p className="text-slate-500 font-medium">Suivi du cycle de vie pédagogique : Contrat ➔ Diagnostic ➔ TSF.</p>
                    </div>
                    <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 px-4 py-1.5 rounded-full font-bold uppercase tracking-widest text-[10px]">
                        Industrialisation Pédagogique
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <table className="w-full text-sm text-left">
                    <thead className="bg-white text-slate-400 font-black uppercase tracking-widest text-[10px] border-b border-slate-100">
                        <tr>
                            <th className="p-8">Apprenti / Dossier</th>
                            <th className="p-8 text-center">Étape 1 : Contrat</th>
                            <th className="p-8 text-center">Étape 2 : Positionnement</th>
                            <th className="p-8 text-center">Étape 3 : TSF</th>
                            <th className="p-8 text-center">Étape 4 : Tuteur</th>
                            <th className="p-8 text-right">Statut Workflow</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {stats.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-20 text-center text-slate-300 font-medium italic">Aucun dossier en cours de traitement.</td>
                            </tr>
                        ) : stats.map(s => (
                            <tr key={s.contractId} className="group hover:bg-slate-50/30 transition-colors">
                                <td className="p-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                                            <User size={18} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900">{s.apprenticeName}</div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[120px]">{s.contractId}</div>
                                        </div>
                                    </div>
                                </td>

                                <td className="p-8 text-center">
                                    <div className="flex justify-center">
                                        {s.step1 === 'DONE' ? (
                                            <CheckCircle2 className="text-emerald-500" size={24} />
                                        ) : (
                                            <Circle className="text-slate-200" size={24} />
                                        )}
                                    </div>
                                </td>

                                <td className="p-8 text-center relative">
                                    <div className="flex justify-center">
                                        {s.step2 === 'DONE' ? (
                                            <CheckCircle2 className="text-emerald-500" size={24} />
                                        ) : (
                                            <Activity className={s.blockedAt === 2 ? "text-amber-500 animate-pulse" : "text-slate-200"} size={24} />
                                        )}
                                    </div>
                                    {s.blockedAt === 2 && (
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-4 px-2 py-0.5 bg-amber-50 text-amber-700 text-[8px] font-black uppercase rounded border border-amber-100">Action Diagnostic</div>
                                    )}
                                </td>

                                <td className="p-8 text-center relative">
                                    <div className="flex justify-center">
                                        {s.step3 === 'DONE' ? (
                                            <CheckCircle2 className="text-emerald-500" size={24} />
                                        ) : (
                                            <Circle className={s.blockedAt === 3 ? "text-indigo-400 animate-pulse" : "text-slate-200"} size={24} />
                                        )}
                                    </div>
                                    {s.blockedAt === 3 && (
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-4 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[8px] font-black uppercase rounded border border-indigo-100 text-nowrap">TSF Attendu</div>
                                    )}
                                </td>

                                <td className="p-8 text-center relative">
                                    <div className="flex justify-center">
                                        {s.step4 === 'DONE' ? (
                                            <Lock className="text-emerald-500" size={24} />
                                        ) : (
                                            <Circle className={s.blockedAt === 4 ? "text-amber-500 animate-pulse" : "text-slate-200"} size={24} />
                                        )}
                                    </div>
                                    {s.blockedAt === 4 && (
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-4 px-2 py-0.5 bg-amber-50 text-amber-700 text-[8px] font-black uppercase rounded border border-amber-100 text-nowrap">Validation Tuteur</div>
                                    )}
                                </td>

                                <td className="p-8 text-right">
                                    {s.step4 === 'DONE' ? (
                                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 gap-1.5 px-3 py-1 font-bold uppercase tracking-widest text-[10px]">
                                            <CheckCircle2 size={12} /> Complété
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-slate-50 text-slate-600 border-slate-100 gap-1.5 px-3 py-1 font-bold uppercase tracking-widest text-[10px]">
                                            <AlertCircle size={12} /> En Cours
                                        </Badge>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    )
}
