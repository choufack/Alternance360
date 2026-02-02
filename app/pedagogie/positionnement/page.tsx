import { AssessmentStepper } from '@/components/pedagogie/assessment-stepper'
import { auth } from '@/auth'
import db from '@/lib/db'
import { redirect } from 'next/navigation'
import { AlertCircle } from 'lucide-react'

export default async function PositioningPage() {
    const session = await auth()
    if (!session || !session.user || !session.user.id) {
        redirect('/login')
    }

    const userId = session.user.id

    // 1. Fetch Active Contract
    const contract = await db.contract.findFirst({
        where: { userId: userId },
        include: {
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
                <p className="text-gray-500 mt-2">Vous devez être associé à un contrat et un référentiel pour commencer le positionnement.</p>
            </div>
        )
    }

    // 2. Format Competences for Stepper
    // Flatten the blocs structure
    const competences = contract.referentiel?.blocs?.flatMap(bloc =>
        bloc.competences.map(comp => ({
            id: comp.id,
            description: comp.description,
            bloc_title: bloc.title
        }))
    ) || []

    // 3. Check for Existing Draft
    const existingDraft = await db.initialAssessment.findFirst({
        where: {
            contractId: contract.id,
            status: 'DRAFT'
        }
    })

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Mon Positionnement Initial</h1>
                    <p className="text-slate-500">Évaluez vos compétences actuelles pour définir votre parcours.</p>
                </div>

                <AssessmentStepper
                    contractId={contract.id}
                    assessmentId={existingDraft?.id || null}
                    competences={competences}
                />
            </div>
        </div>
    )
}
