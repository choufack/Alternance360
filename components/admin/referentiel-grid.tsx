'use client'

import { useState, useTransition } from 'react'
import { Trash2, Settings2, Library, FileText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { deleteReferentiel } from '@/app/actions/referentiels'
import { toast } from 'sonner'

type Referentiel = {
    id: string
    title: string
    codeRncp: string
    isGlobal: boolean
    status?: string | null
    _count: { blocs: number; contracts: number }
}

export function ReferentielGrid({ referentiels }: { referentiels: Referentiel[] }) {
    const [deleteTarget, setDeleteTarget] = useState<Referentiel | null>(null)
    const [isPending, startTransition] = useTransition()

    function handleDelete() {
        if (!deleteTarget) return
        startTransition(async () => {
            const res = await deleteReferentiel(deleteTarget.id)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success(`Référentiel "${deleteTarget.title}" supprimé.`)
                setDeleteTarget(null)
            }
        })
    }

    return (
        <>
            {referentiels.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {referentiels.map((ref) => (
                        <div
                            key={ref.id}
                            className="group bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:shadow-emerald-100/50 hover:border-emerald-200 transition-all flex flex-col"
                        >
                            {/* Header */}
                            <div className="flex justify-between items-start mb-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${ref.isGlobal
                                    ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                                    : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'
                                    }`}>
                                    {ref.isGlobal ? <Library size={28} /> : <FileText size={28} />}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className={ref.isGlobal
                                        ? "bg-blue-600 text-white border-0 px-3 py-1 uppercase text-[10px] font-black tracking-widest"
                                        : "bg-emerald-600 text-white border-0 px-3 py-1 uppercase text-[10px] font-black tracking-widest"
                                    }>
                                        {ref.isGlobal ? "Officiel" : "Atelier Local"}
                                    </Badge>
                                    {(ref.status === 'INACTIVE') && (
                                        <Badge variant="destructive" className="px-3 py-1 uppercase text-[10px] font-black tracking-widest animate-pulse">
                                            INACTIF
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 mb-6">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                    {ref.codeRncp}
                                </div>
                                <h3 className="text-xl font-black text-slate-900 leading-tight line-clamp-2" title={ref.title}>
                                    {ref.title}
                                </h3>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-6 mb-6 py-4 border-y border-slate-50">
                                <div className="text-center">
                                    <div className="text-2xl font-black text-slate-900">{ref._count.blocs}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Blocs</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-black text-slate-900">{ref._count.contracts}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contrats</div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <Link href={`/admin/referentiels/${ref.id}/configurator`} className="flex-1">
                                    <Button className="w-full h-12 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-bold gap-2 transition-all">
                                        <Settings2 size={18} />
                                        {ref.isGlobal ? "Consulter" : "Configurer"}
                                    </Button>
                                </Link>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-12 w-12 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                    onClick={() => setDeleteTarget(ref)}
                                >
                                    <Trash2 size={18} />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-24 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-400">
                        <FileText size={36} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-3">Bibliothèque vide</h3>
                    <p className="text-slate-500 max-w-md mx-auto mb-8">
                        Importez un référentiel RNCP officiel pour commencer.
                    </p>
                    <Link href="/admin/import">
                        <Button className="h-14 px-8 rounded-2xl bg-slate-900 hover:bg-emerald-600 text-white font-bold gap-2 shadow-xl shadow-slate-200">
                            <Plus size={18} />
                            Importer un RNCP
                        </Button>
                    </Link>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Supprimer le référentiel ?</DialogTitle>
                        <DialogDescription>
                            Vous êtes sur le point de supprimer <strong>{deleteTarget?.title}</strong> ({deleteTarget?.codeRncp}).
                            <br /><br />
                            Cette action est <strong>irréversible</strong> et supprimera également tous les blocs de compétences et indicateurs associés.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isPending}>
                            Annuler
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
                            {isPending ? 'Suppression...' : 'Supprimer définitivement'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
