'use client'

import { useState, useTransition } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { updateFiliere } from '@/app/actions/filieres'
import { toast } from 'sonner'

type Referentiel = {
    id: string
    title: string
    codeRncp: string
}

type Filiere = {
    id: string
    name: string
    description: string | null
    referentielId: string | null
}

interface FiliereEditModalProps {
    filiere: Filiere
    referentiels: Referentiel[]
}

export function FiliereEditModal({ filiere, referentiels }: FiliereEditModalProps) {
    const [open, setOpen] = useState(false)
    const [name, setName] = useState(filiere.name)
    const [description, setDescription] = useState(filiere.description || '')
    const [referentielId, setReferentielId] = useState(filiere.referentielId || '')
    const [isPending, startTransition] = useTransition()

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        startTransition(async () => {
            const res = await updateFiliere({ id: filiere.id, name, description, referentielId: referentielId || undefined })
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success('Filière mise à jour avec succès !')
                setOpen(false)
            }
        })
    }

    return (
        <>
            <Button
                onClick={() => setOpen(true)}
                className="h-12 px-6 rounded-2xl bg-slate-900 hover:bg-indigo-600 text-white font-bold gap-2 transition-all shadow-lg"
            >
                <Pencil size={16} />
                Modifier
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black">Modifier la filière</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-5 py-4">
                        <div className="space-y-2">
                            <Label className="font-bold text-slate-700">Nom de la filière</Label>
                            <Input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Ex: Développeur Web"
                                required
                                className="h-12 rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="font-bold text-slate-700">Description</Label>
                            <Input
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Description optionnelle"
                                className="h-12 rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="font-bold text-slate-700">Référentiel RNCP associé</Label>
                            <select
                                value={referentielId}
                                onChange={e => setReferentielId(e.target.value)}
                                className="w-full h-12 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            >
                                <option value="">Aucun</option>
                                {referentiels.map(ref => (
                                    <option key={ref.id} value={ref.id}>
                                        {ref.codeRncp} — {ref.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                disabled={isPending}
                                className="rounded-xl"
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="rounded-xl bg-indigo-600 hover:bg-indigo-700"
                            >
                                {isPending ? 'Enregistrement...' : 'Enregistrer'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}
