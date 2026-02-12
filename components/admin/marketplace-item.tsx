'use client'

import { useState, useTransition, useEffect } from 'react'
import { cloneReferentielAction } from '@/app/actions/import-rncp-bridge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Plus, Loader2, Library, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

export function MarketplaceItem({
    referentiel,
    isAdded,
    userRole
}: {
    referentiel: any,
    isAdded: boolean,
    userRole?: string
}) {
    const [isPending, startTransition] = useTransition()
    const [added, setAdded] = useState(isAdded)
    const [hasMounted, setHasMounted] = useState(false)

    useEffect(() => {
        setHasMounted(true)
    }, [])

    const handleAdd = () => {
        startTransition(async () => {
            const result = await cloneReferentielAction(referentiel.id)
            if (result.success) {
                setAdded(true)
                toast.success(result.message)
            } else {
                toast.error(result.error)
            }
        })
    }

    if (!hasMounted) {
        return (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm animate-pulse">
                <div className="w-16 h-16 rounded-[1.25rem] bg-slate-50 mb-6" />
                <div className="h-8 bg-slate-50 rounded-lg w-3/4 mb-4" />
                <div className="h-14 bg-slate-50 rounded-2xl w-full" />
            </div>
        )
    }

    // Role-based visibility check
    const isSuperAdmin = userRole === 'super_admin'

    return (
        <div className="group bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm hover:shadow-2xl hover:shadow-indigo-100/50 hover:border-indigo-200 transition-all flex flex-col">
            <div className="flex justify-between items-start mb-6">
                <div className="w-16 h-16 rounded-[1.25rem] bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                    <Library size={32} />
                </div>
                <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-slate-200 font-mono">
                        {referentiel.codeRncp}
                    </Badge>
                    {referentiel.status === 'INACTIVE' && (
                        <Badge variant="destructive" className="text-[10px] font-black uppercase tracking-widest">
                            INACTIF
                        </Badge>
                    )}
                </div>
            </div>

            <div className="flex-1 mb-8">
                <h3 className="text-2xl font-black text-slate-900 leading-tight mb-3 line-clamp-2">
                    {referentiel.title}
                </h3>
                <div className="flex items-center gap-4 text-slate-400 font-bold text-xs uppercase tracking-wider">
                    <span>{referentiel._count.blocs} Blocs</span>
                    <span className="w-1 h-1 rounded-full bg-slate-200" />
                    <span>Certifié RNCP</span>
                </div>
            </div>

            {!isSuperAdmin && (
                <Button
                    onClick={handleAdd}
                    disabled={added || isPending}
                    className={`w-full h-14 rounded-2xl font-black text-sm uppercase tracking-wider gap-3 transition-all duration-300 ${added
                        ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-50 border border-emerald-100"
                        : "bg-slate-900 text-white hover:bg-indigo-600 shadow-xl shadow-slate-200 hover:shadow-indigo-200"
                        }`}
                >
                    {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        added ? <CheckCircle size={20} /> : <Plus size={20} />
                    )}
                    {added ? "Dans l'Atelier" : "Ajouter à l'Atelier"}
                    {!added && !isPending && <ArrowRight size={18} className="ml-auto opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all" />}
                </Button>
            )}

            {isSuperAdmin && (
                <div className="h-14 flex items-center justify-center text-slate-400 font-bold italic text-sm">
                    Vue Administrateur Globale
                </div>
            )}
        </div>
    )
}
