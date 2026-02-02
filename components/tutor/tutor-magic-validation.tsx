'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, FileText, Loader2 } from 'lucide-react'
import { validateProof } from '@/app/actions/validate-proof'
import { toast } from 'sonner'

export function TutorMagicValidation({ proofs, contractId, apprentice }: { proofs: any[], contractId: string, apprentice: any }) {
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({})
    const [validatedSet, setValidatedSet] = useState<Set<string>>(new Set())

    const handleValidate = async (proofId: string) => {
        setLoadingMap(prev => ({ ...prev, [proofId]: true }))
        try {
            const res = await validateProof(proofId, 'VALIDATED', 'Validé par le tuteur via Magic Link')
            if (res.success) {
                setValidatedSet(prev => new Set(prev).add(proofId))
                toast.success("La preuve a été validée avec succès.")
            } else {
                toast.error(res.error || "Erreur lors de la validation")
            }
        } catch (e) {
            toast.error("Une erreur est survenue.")
        } finally {
            setLoadingMap(prev => ({ ...prev, [proofId]: false }))
        }
    }

    if (proofs.length === 0) {
        return <p className="text-slate-500 text-sm italic">Aucune preuve en attente pour cet apprenti.</p>
    }

    return (
        <div className="space-y-4">
            {proofs.map((proof) => (
                <div key={proof.id} className="p-4 border rounded-lg flex items-center justify-between bg-white shadow-sm transition-all hover:bg-slate-50">
                    <div className="flex gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                            {apprentice?.fullName?.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <div>
                            <p className="font-medium text-sm">{proof.title}</p>
                            <p className="text-xs text-slate-500">
                                {new Date(proof.createdAt).toLocaleDateString('fr-FR')}
                                {proof.competence?.description ? ` • ${proof.competence.description.substring(0, 30)}...` : ''}
                            </p>
                        </div>
                    </div>

                    {validatedSet.has(proof.id) || proof.status === 'VALIDATED' ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Validé
                        </Badge>
                    ) : (
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => handleValidate(proof.id)}
                            disabled={loadingMap[proof.id]}
                        >
                            {loadingMap[proof.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                            Valider
                        </Button>
                    )}
                </div>
            ))}
        </div>
    )
}

function Badge({ children, className }: { children: React.ReactNode, className: string }) {
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${className}`}>
            {children}
        </span>
    )
}
