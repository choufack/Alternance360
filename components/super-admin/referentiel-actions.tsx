"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { RNCPImporter } from "@/components/admin/rncp-importer"
import { Plus, Globe, Lock, Loader2 } from "lucide-react"
import { toggleReferentielVisibility } from "@/app/actions/super-admin"
import { cloneReferentielAction } from "@/app/actions/import-rncp-bridge"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function AddToAtelierButton({ referentielId }: { referentielId: string }) {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleAdd = async () => {
        setIsLoading(true)
        try {
            const result = await cloneReferentielAction(referentielId)
            if (result.success) {
                toast.success(result.message)
                router.push('/admin/referentiels')
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error("Une erreur est survenue")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Button
            onClick={handleAdd}
            disabled={isLoading}
            variant="outline"
            className="rounded-xl h-12 font-bold border-emerald-100 text-emerald-600 hover:bg-emerald-50"
        >
            {isLoading ? <Loader2 className="animate-spin" /> : <Plus size={16} className="mr-2" />}
            Atelier
        </Button>
    )
}

export function NewReferentielButton() {
    const [open, setOpen] = useState(false)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="h-14 px-8 rounded-2xl bg-slate-900 hover:bg-slate-800 font-black shadow-xl shadow-slate-200 gap-2">
                    <Plus size={20} /> Nouveau Référentiel
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Importer un Référentiel Global</DialogTitle>
                </DialogHeader>
                <div className="py-6">
                    {/* No tenantId passed = Global Mode */}
                    <RNCPImporter />
                </div>
            </DialogContent>
        </Dialog>
    )
}

export function ToggleVisibilityButton({ referentielId, isGlobal }: { referentielId: string, isGlobal: boolean }) {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleToggle = async () => {
        setIsLoading(true)
        try {
            const result = await toggleReferentielVisibility(referentielId)
            if (result.success) {
                toast.success(result.isGlobal ? "Référentiel publié globalement" : "Référentiel retiré du global")
                router.refresh()
            } else {
                toast.error("Erreur lors de la modification")
            }
        } catch (error) {
            toast.error("Une erreur est survenue")
        } finally {
            setIsLoading(false)
        }
    }

    if (isGlobal) {
        return (
            <Button
                onClick={handleToggle}
                disabled={isLoading}
                variant="outline"
                className="flex-1 rounded-xl h-12 font-bold border-indigo-100 text-indigo-600 hover:bg-indigo-50"
            >
                {isLoading ? <Loader2 className="animate-spin" /> : <Globe size={16} className="mr-2" />}
                Publié
            </Button>
        )
    }

    return (
        <Button
            onClick={handleToggle}
            disabled={isLoading}
            variant="outline"
            className="flex-1 rounded-xl h-12 font-bold border-slate-100 text-slate-500 hover:bg-slate-50"
        >
            {isLoading ? <Loader2 className="animate-spin" /> : <Lock size={16} className="mr-2" />}
            Privé
        </Button>
    )
}
