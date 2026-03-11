'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, RotateCcw, XCircle, Send, Check, UserIcon, ShieldCheck } from 'lucide-react'
import { validateEvaluationAction } from '@/app/actions/tutor-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'

type Status = 'ACQUIS' | 'IN_PROGRESS' | 'PENDING'

interface TutorEvalFormProps {
    token: string
    contractId: string
    periodId: string
    competencies: {
        id: string
        description: string
        blocTitle: string
        apprenticeStatus: string
        apprenticeComment: string
        tutorStatus: string
        tutorComment: string
        indicateurs: {
            id: string
            description: string
        }[]
    }[]
}

export function TutorEvalForm({ token, contractId, periodId, competencies }: TutorEvalFormProps) {
    const [evaluations, setEvaluations] = useState<Record<string, { tutorStatus: Status, tutorComment: string }>>(
        competencies.reduce((acc, comp) => {
            acc[comp.id] = {
                tutorStatus: (comp.tutorStatus as Status) || (comp.apprenticeStatus as Status) || 'PENDING',
                tutorComment: comp.tutorComment || ''
            }
            return acc
        }, {} as Record<string, { tutorStatus: Status, tutorComment: string }>)
    )
    const [isSigned, setIsSigned] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleStatusChange = (id: string, tutorStatus: Status) => {
        setEvaluations(prev => ({
            ...prev,
            [id]: { ...prev[id], tutorStatus }
        }))
    }

    const handleCommentChange = (id: string, tutorComment: string) => {
        setEvaluations(prev => ({
            ...prev,
            [id]: { ...prev[id], tutorComment }
        }))
    }

    const handleSubmit = async () => {
        if (!isSigned) {
            toast.error("Veuillez signer électroniquement pour valider.")
            return
        }

        setLoading(true)
        try {
            const payload = Object.entries(evaluations).map(([id, val]) => ({
                competenceId: id,
                tutorStatus: val.tutorStatus,
                tutorComment: val.tutorComment
            }))

            const res = await validateEvaluationAction(token, payload)

            if (res.success) {
                toast.success("Validation enregistrée avec succès !")
                router.push(`/tutor/access/${token}/success`)
            } else {
                toast.error("Une erreur est survenue.")
            }
        } catch (e: any) {
            toast.error(e.message || "Erreur de connexion.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-8 pb-20">
            {competencies.map((comp) => (
                <Card key={comp.id} className="overflow-hidden border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem] bg-white">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                        <div className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">{comp.blocTitle}</div>
                        <CardTitle className="text-xl font-black text-slate-900 tracking-tight">{comp.description}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        {/* Apprentice Input (READ ONLY) */}
                        <div className="bg-indigo-50/30 p-6 rounded-3xl border border-indigo-100/50 space-y-4">
                            <div className="flex items-center gap-2 text-indigo-600 font-bold text-[10px] uppercase tracking-wider">
                                <UserIcon size={14} />
                                Auto-évaluation de l'apprenti
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={clsx(
                                    "px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2",
                                    comp.apprenticeStatus === 'ACQUIS' ? "bg-emerald-100 text-emerald-700" :
                                        comp.apprenticeStatus === 'IN_PROGRESS' ? "bg-orange-100 text-orange-700" : "bg-rose-100 text-rose-700"
                                )}>
                                    {comp.apprenticeStatus === 'ACQUIS' && <CheckCircle2 size={14} />}
                                    {comp.apprenticeStatus === 'IN_PROGRESS' && <RotateCcw size={14} />}
                                    {comp.apprenticeStatus === 'PENDING' && <XCircle size={14} />}
                                    {comp.apprenticeStatus === 'ACQUIS' ? 'ACQUIS' : comp.apprenticeStatus === 'IN_PROGRESS' ? 'EN COURS' : 'NON ACQUIS'}
                                </div>
                                {comp.apprenticeComment && (
                                    <p className="text-slate-600 text-sm font-medium">
                                        "{comp.apprenticeComment}"
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Tutor Validation */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-indigo-600 font-bold text-[10px] uppercase tracking-wider">
                                <ShieldCheck size={14} />
                                Votre validation (Tuteur)
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <button
                                    onClick={() => handleStatusChange(comp.id, 'ACQUIS')}
                                    className={clsx(
                                        "flex items-center gap-3 p-5 rounded-2xl border-2 transition-all font-bold text-sm",
                                        evaluations[comp.id]?.tutorStatus === 'ACQUIS'
                                            ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-lg shadow-emerald-100"
                                            : "bg-white border-slate-100 text-slate-400 hover:border-emerald-200"
                                    )}
                                >
                                    <CheckCircle2 size={22} className={evaluations[comp.id]?.tutorStatus === 'ACQUIS' ? "text-emerald-500" : "text-slate-300"} />
                                    Acquis
                                </button>

                                <button
                                    onClick={() => handleStatusChange(comp.id, 'IN_PROGRESS')}
                                    className={clsx(
                                        "flex items-center gap-3 p-5 rounded-2xl border-2 transition-all font-bold text-sm",
                                        evaluations[comp.id]?.tutorStatus === 'IN_PROGRESS'
                                            ? "bg-orange-50 border-orange-500 text-orange-700 shadow-lg shadow-orange-100"
                                            : "bg-white border-slate-100 text-slate-400 hover:border-orange-200"
                                    )}
                                >
                                    <RotateCcw size={22} className={evaluations[comp.id]?.tutorStatus === 'IN_PROGRESS' ? "text-orange-500" : "text-slate-300"} />
                                    En cours
                                </button>

                                <button
                                    onClick={() => handleStatusChange(comp.id, 'PENDING')}
                                    className={clsx(
                                        "flex items-center gap-3 p-5 rounded-2xl border-2 transition-all font-bold text-sm",
                                        evaluations[comp.id]?.tutorStatus === 'PENDING'
                                            ? "bg-rose-50 border-rose-500 text-rose-700 shadow-lg shadow-rose-100"
                                            : "bg-white border-slate-100 text-slate-400 hover:border-rose-200"
                                    )}
                                >
                                    <XCircle size={22} className={evaluations[comp.id]?.tutorStatus === 'PENDING' ? "text-rose-500" : "text-slate-300"} />
                                    Non acquis
                                </button>
                            </div>

                            <Textarea
                                placeholder="Un commentaire pour l'apprenti ou le CFA ?"
                                className="rounded-2xl border-slate-100 focus:ring-indigo-500 min-h-[100px] bg-slate-50/50 p-4 text-sm font-medium"
                                value={evaluations[comp.id]?.tutorComment}
                                onChange={(e) => handleCommentChange(comp.id, e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>
            ))}

            <Card className="p-8 rounded-[2.5rem] border-2 border-indigo-100 bg-indigo-50/30 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <ShieldCheck size={120} className="text-indigo-600" />
                </div>
                <div className="relative z-10 space-y-6">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Validation finale du tuteur</h3>
                        <p className="text-slate-500 font-medium max-w-lg">Je confirme avoir pris connaissance de l'auto-évaluation de l'apprenti et j'apporte ma validation sur les compétences listées.</p>
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
                        <span className="font-bold text-slate-700">Je valide et signe l'évaluation</span>
                    </label>

                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !isSigned}
                        className="w-full md:w-auto px-12 h-16 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-lg shadow-xl shadow-slate-200 transition-all flex items-center gap-3"
                    >
                        {loading ? <RotateCcw className="animate-spin" /> : <ShieldCheck size={20} />}
                        Enregistrer la validation
                    </Button>
                </div>
            </Card>
        </div>
    )
}
