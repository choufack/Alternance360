'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { createOffer, updateOffer, OfferFormData } from '@/app/actions/offers'
import { toast } from 'sonner'
import { Plus, Loader2 } from 'lucide-react'

interface OfferFormProps {
    referentiels: { id: string, title: string, codeRncp: string, isMarketplacePack?: boolean }[]
    existingOffer?: any // Type properly if possible
    trigger?: React.ReactNode
    onSuccess?: () => void
}

export function OfferForm({ referentiels, existingOffer, trigger, onSuccess }: OfferFormProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<Partial<OfferFormData>>({
        title: existingOffer?.title || '',
        description: existingOffer?.description || '',
        status: existingOffer?.status || 'DRAFT',
        price: existingOffer?.price || 0,
        funding: existingOffer?.funding || '',
        startDate: existingOffer?.startDate ? new Date(existingOffer.startDate).toISOString().split('T')[0] : '',
        endDate: existingOffer?.endDate ? new Date(existingOffer.endDate).toISOString().split('T')[0] : '',
        duration: existingOffer?.duration || 0,
        campus: existingOffer?.campus || '',
        seats: existingOffer?.seats || 0,
        referentielId: existingOffer?.referentielId || (referentiels.length === 1 ? referentiels[0].id : '')
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const payload = {
                ...formData,
                price: Number(formData.price),
                duration: Number(formData.duration),
                seats: Number(formData.seats),
            } as OfferFormData

            const result = existingOffer
                ? await updateOffer(existingOffer.id, payload)
                : await createOffer(payload)

            if (result.success) {
                toast.success(existingOffer ? "Offre modifiée" : "Offre créée")
                setOpen(false)
                if (onSuccess) onSuccess()
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error("Une erreur est survenue")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl font-bold">
                        <Plus size={18} />
                        Créer une offre
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-white rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-slate-900">
                        {existingOffer ? "Modifier l'offre" : "Nouvelle Offre de Formation"}
                    </DialogTitle>
                    <DialogDescription>
                        Définissez les paramètres commerciaux de votre session de formation.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-2">
                            <Label>Référentiel RNCP</Label>
                            <Select
                                value={formData.referentielId}
                                onValueChange={(val) => setFormData({ ...formData, referentielId: val })}
                                disabled={!!existingOffer}
                            >
                                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200">
                                    <SelectValue placeholder="Choisir un référentiel..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {referentiels.map(ref => (
                                        <SelectItem key={ref.id} value={ref.id}>
                                            [{ref.codeRncp}] {ref.title} {ref.isMarketplacePack && "📦"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="col-span-2 space-y-2">
                            <Label>Titre Commercial</Label>
                            <Input
                                placeholder="ex: BTS MCO - Rentrée Septembre 2026"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                                className="h-12 rounded-xl bg-slate-50 border-slate-200"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Prix Public (€)</Label>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                className="h-12 rounded-xl bg-slate-50 border-slate-200"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Mode de Financement</Label>
                            <Select
                                value={formData.funding}
                                onValueChange={(val) => setFormData({ ...formData, funding: val })}
                            >
                                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200">
                                    <SelectValue placeholder="Sélectionner..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="OPCO">Prise en charge OPCO</SelectItem>
                                    <SelectItem value="CPF">CPF</SelectItem>
                                    <SelectItem value="POLE_EMPLOI">Pôle Emploi</SelectItem>
                                    <SelectItem value="SELF">Financement Personnel</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Date de Début</Label>
                            <Input
                                type="date"
                                value={formData.startDate as string}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                required
                                className="h-12 rounded-xl bg-slate-50 border-slate-200"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Date de Fin</Label>
                            <Input
                                type="date"
                                value={formData.endDate as string}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                required
                                className="h-12 rounded-xl bg-slate-50 border-slate-200"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Durée (Heures)</Label>
                            <Input
                                type="number"
                                value={formData.duration}
                                onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                                className="h-12 rounded-xl bg-slate-50 border-slate-200"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Places Disponibles</Label>
                            <Input
                                type="number"
                                value={formData.seats}
                                onChange={(e) => setFormData({ ...formData, seats: Number(e.target.value) })}
                                className="h-12 rounded-xl bg-slate-50 border-slate-200"
                            />
                        </div>

                        <div className="col-span-2 space-y-2">
                            <Label>Campus / Lieu</Label>
                            <Input
                                placeholder="ex: Paris 13eme ou Distanciel"
                                value={formData.campus}
                                onChange={(e) => setFormData({ ...formData, campus: e.target.value })}
                                className="h-12 rounded-xl bg-slate-50 border-slate-200"
                            />
                        </div>

                        <div className="col-span-2 space-y-2">
                            <Label>Statut</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(val) => setFormData({ ...formData, status: val })}
                            >
                                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200">
                                    <SelectValue placeholder="Statut" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DRAFT">Brouillon (Non visible)</SelectItem>
                                    <SelectItem value="OPEN">Ouvert aux inscriptions</SelectItem>
                                    <SelectItem value="CLOSED">Fermé</SelectItem>
                                    <SelectItem value="FULL">Complet</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl font-bold border-slate-200">
                            Annuler
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-slate-900 rounded-xl font-bold min-w-[120px]">
                            {loading ? <Loader2 className="animate-spin" /> : "Enregistrer"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
