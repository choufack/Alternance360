import { TSFGrid } from '@/components/pedagogie/tsf-builder'
import { auth } from '@/auth'
import db from '@/lib/db'
import { redirect } from 'next/navigation'
import { AlertCircle } from 'lucide-react'

export default async function TSFPage() {
    const session = await auth()
    if (!session || !session.user || !session.user.id) {
        redirect('/login')
    }

    const userId = session.user.id

    // 1. Fetch Contract & TSF Data
    const contract = await db.contract.findFirst({
        where: { userId: userId },
        include: {
            periodes: { orderBy: { orderIndex: 'asc' } },
            tsfMapping: true,
            referentiel: {
                include: {
                    blocs: {
                        include: {
                            competences: true
                        },
                        orderBy: { orderIndex: 'asc' }
                    }
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    if (!contract) {
        return (
            <div className="container mx-auto py-12 text-center">
                <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold">Aucun contrat actif</h2>
            </div>
        )
    }

    if (contract.periodes.length === 0) {
        return (
            <div className="container mx-auto py-12 text-center">
                <AlertCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold">Parcours non généré</h2>
                <p className="text-gray-500 mt-2">Veuillez compléter votre positionnement initial pour générer le planning.</p>
                <a href="/pedagogie/positionnement" className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">Aller au Positionnement</a>
            </div>
        )
    }

    // 2. Format Data for Grid
    const periods = contract.periodes.map(p => ({
        id: p.id,
        label: p.label
    }))

    const competences = contract.referentiel?.blocs?.flatMap(bloc =>
        bloc.competences.map(comp => ({
            id: comp.id,
            description: comp.description,
            bloc_title: bloc.title
        }))
    ) || []

    const mappings = contract.tsfMapping.map(m => ({
        period_id: m.periodId || '',
        competence_id: m.competenceId,
        flag_cfa: m.flagCfa,
        flag_entreprise: m.flagEntreprise,
        status: m.status
    })).filter(m => m.period_id !== '') // Filter out unmapped if any

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Mon Tableau Stratégique</h1>
                    <p className="text-slate-500">Visualisez et ajustez votre planning de formation (CFA / Entreprise).</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <TSFGrid
                        contractId={contract.id}
                        periods={periods}
                        competences={competences}
                        initialMappings={mappings}
                    />
                </div>
            </div>
        </div>
    )
}
