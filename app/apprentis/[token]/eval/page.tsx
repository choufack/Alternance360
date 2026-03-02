import { createHash } from 'crypto'
import { verifyMagicToken } from '@/app/actions/tutor'
import db from '@/lib/db'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GraduationCap, AlertCircle, Calendar } from 'lucide-react'
import { EvalForm } from '@/components/pedagogie/eval-form'

export default async function EvaluationPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params

    // 1. Verify Token & Fetch associated period
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

    if (!magicToken || new Date() > magicToken.expiresAt) return notFound()

    const anyMagicToken = magicToken as any
    const { contract, period: tokenPeriod } = anyMagicToken
    const today = new Date()

    // 2. Determine target period (Token specific or current)
    const currentPeriod = tokenPeriod || await (db as any).period.findFirst({
        where: {
            contractId: contract.id,
            startDate: { lte: today },
            endDate: { gte: today }
        }
    })

    if (!currentPeriod) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
                <Card className="max-w-md w-full rounded-[2rem] border-blue-100 bg-white shadow-xl">
                    <CardContent className="p-12 text-center space-y-6">
                        <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-3xl flex items-center justify-center mx-auto">
                            <Calendar size={40} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 mb-2">Pas d'évaluation en cours</h1>
                            <p className="text-slate-500 font-medium">Il n'y a pas de période d'auto-évaluation active pour le moment. Revenez plus tard !</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // 2. Fetch Competencies for this Period via TSFMapping
    const mappings = await db.tSFMapping.findMany({
        where: {
            contractId: contract.id,
            periodId: currentPeriod.id,
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

    // 3. Fetch existing evaluations to pre-fill (at Competence level)
    const existingEvaluations = await (db as any).evaluationCompetence.findMany({
        where: {
            contractId: contract.id,
            competenceId: { in: mappings.map(m => m.competenceId) }
        }
    })

    const competencies = mappings.map(m => ({
        id: m.competence.id,
        description: m.competenceDescription || m.competence.description,
        blocTitle: m.blocTitle || m.competence.bloc.title,
        status: existingEvaluations.find((e: any) => e.competenceId === m.competenceId)?.status || 'PENDING',
        comment: existingEvaluations.find((e: any) => e.competenceId === m.competenceId)?.comment || '',
        indicateurs: m.competence.indicateurs.map(ind => ({
            id: ind.id,
            description: ind.description
        }))
    }))

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase tracking-widest text-[10px] mb-2">
                            <GraduationCap size={14} />
                            Auto-Évaluation
                        </div>
                        <h1 className="text-3xl font-black text-slate-900">{currentPeriod.label}</h1>
                        <p className="text-slate-500 font-medium tracking-tight">Validez vos UCP pour cette période.</p>
                    </div>
                    <div className="text-right hidden md:block">
                        <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Apprenti</div>
                        <div className="font-bold text-slate-900">
                            {anyMagicToken.contract?.user?.firstName} {anyMagicToken.contract?.user?.lastName}
                        </div>
                    </div>
                </div>

                <EvalForm
                    token={token}
                    contractId={contract.id}
                    periodId={currentPeriod.id}
                    competencies={competencies as any}
                />
            </div>
        </div>
    )
}
