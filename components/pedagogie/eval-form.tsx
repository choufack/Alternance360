
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, RotateCcw, XCircle, Send, Check } from 'lucide-react'
import { submitEvaluationAction } from '@/app/actions/eval-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'

type Status = 'ACQUIS' | 'IN_PROGRESS' | 'PENDING'

interface EvalFormProps {
    token: string
    contractId: string
    periodId: string
    competencies: {
        id: string
        description: string
        blocTitle: string
        status: string
        comment: string
        indicateurs: {
            id: string
            description: string
        }[]
    }[]
}

export function EvalForm({ token, contractId, periodId, competencies }: EvalFormProps) {
    const [evaluations, setEvaluations] = useState<Record<string, { status: Status, comment: string }>>(
        competencies.reduce((acc, comp) => {
            acc[comp.id] = { status: (comp.status as Status) || 'PENDING', comment: comp.comment || '' }
            return acc
        }, {} as Record<string, { status: Status, comment: string }>)
    )
    const [isSigned, setIsSigned] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleStatusChange = (id: string, status: Status) => {
        setEvaluations(prev => ({
            ...prev,
            [id]: { ...prev[id], status }
        }))
    }

    const handleCommentChange = (id: string, comment: string) => {
        setEvaluations(prev => ({
            ...prev,
            [id]: { ...prev[id], comment }
        }))
    }

    const handleSubmit = async () => {
        if (!isSigned) {
            toast.error("Veuillez signer électroniquement avant d'envoyer.")
            return
        }

        setLoading(true)
        try {
            const res = await submitEvaluationAction({
                token,
                contractId,
                periodId,
                evaluations
            })

            if (res.success) {
                toast.success("Évaluation envoyée avec succès !")
                router.push(`/apprentis/${token}/eval/success`)
            } else {
                toast.error(res.error || "Une erreur est survenue.")
            }
        } catch (e) {
            toast.error("Erreur de connexion.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-8">
            {competencies.map((comp) => (
                <Card key={comp.id} className="overflow-hidden border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem] bg-white">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                        <div className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">{comp.blocTitle}</div>
                        <CardTitle className="text-xl font-black text-slate-900 tracking-tight">{comp.description}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        {/* List of sub-criteria (informative) */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Sous-critères</h4>
                            <ul className="space-y-4 font-medium text-slate-700">
                                {comp.indicateurs.map((ind) => (
                                    <li key={ind.id} className="flex gap-4 items-start">
                                        <div className="w-2 h-2 rounded-full bg-slate-200 mt-1.5 shrink-0" />
                                        {ind.description}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* UCP Status Selection */}
                        <div className="pt-8 border-t border-slate-50">
                            <h4 className="text-[10px] font-black uppercase text-indigo-500 tracking-wider mb-5">État d'acquisition de l'UCP</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <button
                                    onClick={() => handleStatusChange(comp.id, 'ACQUIS')}
                                    className={clsx(
                                        "flex items-center gap-3 p-5 rounded-2xl border-2 transition-all font-bold text-sm",
                                        evaluations[comp.id]?.status === 'ACQUIS'
                                            ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-lg shadow-emerald-100"
                                            : "bg-white border-slate-100 text-slate-400 hover:border-emerald-200"
                                    )}
                                >
                                    <CheckCircle2 size={22} className={evaluations[comp.id]?.status === 'ACQUIS' ? "text-emerald-500" : "text-slate-300"} />
                                    Acquis
                                </button>

                                <button
                                    onClick={() => handleStatusChange(comp.id, 'IN_PROGRESS')}
                                    className={clsx(
                                        "flex items-center gap-3 p-5 rounded-2xl border-2 transition-all font-bold text-sm",
                                        evaluations[comp.id]?.status === 'IN_PROGRESS'
                                            ? "bg-orange-50 border-orange-500 text-orange-700 shadow-lg shadow-orange-100"
                                            : "bg-white border-slate-100 text-slate-400 hover:border-orange-200"
                                    )}
                                >
                                    <RotateCcw size={22} className={evaluations[comp.id]?.status === 'IN_PROGRESS' ? "text-orange-500" : "text-slate-300"} />
                                    En cours
                                </button>

                                <button
                                    onClick={() => handleStatusChange(comp.id, 'PENDING')}
                                    className={clsx(
                                        "flex items-center gap-3 p-5 rounded-2xl border-2 transition-all font-bold text-sm",
                                        evaluations[comp.id]?.status === 'PENDING'
                                            ? "bg-rose-50 border-rose-500 text-rose-700 shadow-lg shadow-rose-100"
                                            : "bg-white border-slate-100 text-slate-400 hover:border-rose-200"
                                    )}
                                >
                                    <XCircle size={22} className={evaluations[comp.id]?.status === 'PENDING' ? "text-rose-500" : "text-slate-300"} />
                                    Non acquis
                                </button>
                            </div>

                            <Textarea
                                placeholder="Un commentaire ou une précision sur cette UCP ?"
                                className="rounded-2xl border-slate-100 focus:ring-indigo-500 min-h-[100px] bg-slate-50/50 p-4 text-sm"
                                value={evaluations[comp.id]?.comment}
                                onChange={(e) => handleCommentChange(comp.id, e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>
            ))}

            <Card className="p-8 rounded-[2.5rem] border-2 border-indigo-100 bg-indigo-50/30 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <CheckCircle2 size={120} className="text-indigo-600" />
                </div>
                <div className="relative z-10 space-y-6">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Signature électronique</h3>
                        <p className="text-slate-500 font-medium max-w-lg">En cochant cette case, je certifie que les informations saisies sont exactes et je valide mon auto-évaluation.</p>
                    </div>

                    <label className="flex items-center gap-4 cursor-pointer group">
                        <div className={clsx(
                            "w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all",
                            isSigned ? "bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-200" : "bg-white border-slate-200 group-hover:border-indigo-300"
                        )}>
                            {isSigned && <Check size={20} className="text-white" />}
                        </div>
                        <input
                            type="checkbox"
                            className="hidden"
                            checked={isSigned}
                            onChange={(e) => setIsSigned(e.target.checked)}
                        />
                        <span className="font-bold text-slate-700">Je signe et certifie mon auto-évaluation</span>
                    </label>

                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !isSigned}
                        className="w-full md:w-auto px-12 h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-200 transition-all flex items-center gap-3"
                    >
                        {loading ? <RotateCcw className="animate-spin" /> : <Send size={20} />}
                        Envoyer au tuteur
                    </Button>
                </div>
            </Card>
        </div>
    )
}
