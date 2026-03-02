
'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface BulkNotifyApprenticesButtonProps {
    promotionId: string
    apprenticeCount: number
    availablePeriods: string[]
}

export function BulkNotifyApprenticesButton({ promotionId, apprenticeCount, availablePeriods }: BulkNotifyApprenticesButtonProps) {
    const [isLoading, setIsLoading] = useState(false)

    const handleNotify = async (periodLabel: string) => {
        if (!confirm(`Envoyer le livret d'auto-évaluation pour la période "${periodLabel}" aux ${apprenticeCount} apprentis ?`)) {
            return
        }

        setIsLoading(true)
        try {
            const response = await fetch(`/api/sessions/${promotionId}/trigger`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': 'debug-secret-123'
                },
                body: JSON.stringify({ periodLabel })
            })

            const data = await response.json()

            if (data.success) {
                toast.success(`Emails envoyés : ${data.summary.success}/${apprenticeCount}`, {
                    description: data.summary.failed > 0 ? `${data.summary.failed} échecs.` : "Tous les apprentis ont été notifiés.",
                    duration: 5000
                })
            } else {
                toast.error("Erreur lors de l'envoi", {
                    description: data.error || "Une erreur inconnue est survenue."
                })
            }
        } catch (error) {
            console.error("Error triggering emails:", error)
            toast.error("Erreur réseau")
        } finally {
            setIsLoading(false)
        }
    }

    if (availablePeriods.length === 0) {
        return (
            <Button disabled variant="outline" className="text-slate-400">
                <Mail size={16} className="mr-2" />
                Aucune période définie
            </Button>
        )
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    disabled={isLoading || apprenticeCount === 0}
                    variant="outline"
                    className="border-blue-200 hover:border-blue-300 hover:bg-blue-50 text-blue-700 font-bold shadow-sm transition-all"
                >
                    {isLoading ? (
                        <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                        <Mail size={16} className="mr-2" />
                    )}
                    Déclencher l'envoi
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Choisir la période
                </div>
                {availablePeriods.map(label => (
                    <DropdownMenuItem
                        key={label}
                        onClick={() => handleNotify(label)}
                        className="font-medium cursor-pointer"
                    >
                        {label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
