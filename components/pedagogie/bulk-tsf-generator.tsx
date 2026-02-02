'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Sparkles, Loader2, CheckCircle, AlertTriangle } from "lucide-react"
import { generateTSFForPromotion } from "@/app/actions/bulk-generate-tsf"
import { toast } from "sonner"

interface Promotion {
    id: string
    name: string
    year: number
}

export function BulkTSFGenerator({ promotions }: { promotions: Promotion[] }) {
    const [open, setOpen] = useState(false)
    const [selectedPromo, setSelectedPromo] = useState<string>("")
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{ count: number, failed: number } | null>(null)

    const handleGenerate = async () => {
        if (!selectedPromo) return

        setLoading(true)
        setResult(null)
        try {
            const res = await generateTSFForPromotion(selectedPromo)
            if (res.success) {
                setResult({ count: res.count || 0, failed: res.failed || 0 })
                toast.success(res.message)
            } else {
                toast.error(res.error || "Erreur inconnue")
            }
        } catch (e) {
            toast.error("Une erreur système est survenue")
        } finally {
            setLoading(false)
        }
    }

    const reset = () => {
        setOpen(false)
        setResult(null)
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 border-0 shadow-lg shadow-indigo-500/20">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Générer par Promotion
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Génération en masse du TSF</DialogTitle>
                    <DialogDescription>
                        Initialisez automatiquement le Tableau Stratégique de Formation pour tous les alternants d'une promotion.
                    </DialogDescription>
                </DialogHeader>

                {!result ? (
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Choisir la promotion cible
                            </label>
                            <Select onValueChange={setSelectedPromo} value={selectedPromo}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner une promotion" />
                                </SelectTrigger>
                                <SelectContent>
                                    {promotions.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name} ({p.year})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex gap-2">
                            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                            <p>Attention : Cette action réinitialisera les plannings TSF existants pour ces étudiants (hors validations acquises).</p>
                        </div>
                    </div>
                ) : (
                    <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                            <CheckCircle className="h-8 w-8" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Génération terminée !</h3>
                            <p className="text-slate-500 mt-1">
                                <span className="font-bold text-emerald-600">{result.count}</span> TSF générés avec succès.
                                {result.failed > 0 && <span className="block text-rose-500 text-xs mt-1">({result.failed} erreurs ignorées)</span>}
                            </p>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {!result ? (
                        <Button onClick={handleGenerate} disabled={!selectedPromo || loading} className="w-full">
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Traitement en cours...
                                </>
                            ) : (
                                "Lancer la génération"
                            )}
                        </Button>
                    ) : (
                        <Button onClick={reset} className="w-full">Fermer</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
