import { createHash } from 'crypto'
import db from '@/lib/db'
import { notFound } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { ShieldCheck, GraduationCap, UserIcon } from 'lucide-react'
import { TutorEvalForm } from '@/components/pedagogie/tutor-eval-form'

export default async function TutorAccessPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params

    // 1. Verify Token
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const magicToken = await db.magicToken.findUnique({
        where: { tokenHash },
        include: {
            contract: {
                include: { user: true }
            },
            period: true
        } as any
    })

    if (!magicToken || magicToken.type !== 'TUTOR_ACCESS' || new Date() > magicToken.expiresAt) {
        return notFound()
    }

    const anyMagicToken = magicToken as any
    const { contract, period: tokenPeriod } = anyMagicToken

    if (!tokenPeriod) return notFound() // Tutor tokens MUST be linked to a period

    // 2. Fetch Competencies for this Period via TSFMapping
    const mappings = await db.tSFMapping.findMany({
        where: {
            contractId: contract.id,
            periodId: tokenPeriod.id,
            OR: [
                { flagCfa: true },
                { flagEntreprise: true }
            ]
        },
        include: {
            competence: {
                include: {
                    bloc: true,
                    indicateurs: true
                }
            }
        }
    })

    // 3. Fetch existing evaluations (at Competence level)
    const existingEvaluations = await (db as any).evaluationCompetence.findMany({
        where: {
            contractId: contract.id,
            competenceId: { in: mappings.map(m => m.competenceId) }
        }
    })

    const competencies = mappings.map(m => {
        const evalData = existingEvaluations.find((e: any) => e.competenceId === m.competenceId)
        return {
            id: m.competence.id,
            description: m.competenceDescription || m.competence.description,
            blocTitle: m.blocTitle || m.competence.bloc.title,
            apprenticeStatus: evalData?.status || 'PENDING',
            apprenticeComment: evalData?.comment || '',
            tutorStatus: evalData?.tutorStatus || '',
            tutorComment: evalData?.tutorComment || '',
            indicateurs: m.competence.indicateurs.map(ind => ({
                id: ind.id,
                description: ind.description
            }))
        }
    })

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                        <ShieldCheck size={180} />
                    </div>

                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase tracking-widest text-[10px]">
                            <ShieldCheck size={14} />
                            Portail de Validation Tuteur
                        </div>

                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 mb-2 leading-tight">
                                    Validation {tokenPeriod.label}
                                </h1>
                                <p className="text-slate-500 font-medium tracking-tight text-lg">
                                    Évaluez les compétences professionnelles de votre apprenti.
                                </p>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 min-w-[240px]">
                                <div className="text-[10px] font-black uppercase text-slate-400 mb-2 flex items-center gap-1.5">
                                    <GraduationCap size={12} />
                                    Apprenti
                                </div>
                                <div className="font-bold text-slate-900 text-lg">
                                    {contract.user?.firstName} {contract.user?.lastName}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Section */}
                <TutorEvalForm
                    token={token}
                    contractId={contract.id}
                    periodId={tokenPeriod.id}
                    competencies={competencies as any}
                />
            </div>
        </div>
    )
}
