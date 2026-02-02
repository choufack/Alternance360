import { getGlobalReferentiels } from "@/app/actions/super-admin"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    BookOpen,
    Search,
    Download,
    Plus,
    Globe,
    Building2,
    ChevronRight,
    Library,
    FileText,
    History,
    MoreVertical
} from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { NewReferentielButton, ToggleVisibilityButton } from "@/components/super-admin/referentiel-actions"

import { ReferentielSearch } from "@/components/super-admin/referentiel-search"

export default async function GlobalReferentielsPage({
    searchParams
}: {
    searchParams: Promise<{ q?: string }>
}) {
    const { q } = await searchParams
    const referentiels = await getGlobalReferentiels(q)

    return (
        <div className="space-y-10">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-[0.2em] mb-3">
                        <Library size={14} />
                        <span>Pedagogical Assets</span>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-none mb-4">Référentiels.</h1>
                    <p className="text-slate-500 font-medium text-lg">Gérez les cadres RNCP globaux et spécifiques aux CFAs.</p>
                </div>

                <NewReferentielButton />
            </header>

            <div className="flex flex-col md:flex-row gap-4">
                <ReferentielSearch />
                <div className="flex bg-white p-1 rounded-2xl border border-slate-100">
                    <button className="px-6 py-2 rounded-xl bg-slate-900 text-white font-bold text-sm">Tous</button>
                    <button className="px-6 py-2 rounded-xl text-slate-500 font-bold text-sm">Génériques</button>
                    <button className="px-6 py-2 rounded-xl text-slate-500 font-bold text-sm">Propriétaires</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {referentiels.map((ref: any) => (
                    <div key={ref.id} className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all group relative overflow-hidden">
                        {ref.isGlobal && (
                            <div className="absolute top-0 right-0 p-4">
                                <Badge className="bg-indigo-600 text-white border-0 gap-1 rounded-lg">
                                    <Globe size={10} /> GLOBAL
                                </Badge>
                            </div>
                        )}

                        <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors mb-6">
                            <FileText size={28} />
                        </div>

                        <div className="space-y-4">
                            <div>
                                <div className="text-[10px] font-black text-indigo-600/60 uppercase tracking-widest">{ref.codeRncp}</div>
                                <h3 className="text-xl font-black text-slate-900 line-clamp-2 mt-1">{ref.title}</h3>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Utilisation</span>
                                    <div className="flex items-center gap-1.5 text-slate-700 font-black">
                                        <Building2 size={14} className="text-slate-300" />
                                        {ref._count.contracts} Contrats
                                    </div>
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">CFA Déteneur</span>
                                    <div className="text-slate-900 font-bold">
                                        {ref.isGlobal ? "Tous" : (ref.tenant?.name || "Privé")}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex gap-2">
                            <ToggleVisibilityButton referentielId={ref.id} isGlobal={ref.isGlobal} />

                            <Button variant="ghost" className="w-12 h-12 p-0 rounded-xl hover:bg-slate-100">
                                <MoreVertical size={18} />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
