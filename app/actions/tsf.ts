'use server'

import db from '@/lib/db'
import { auth } from '@/auth'
import { cache } from 'react'
import { revalidatePath } from 'next/cache'

/**
 * Récupère le TSF (Tableau Stratégique de Formation) complet pour un contrat donné.
 * Inclut la structure pédagogique (Référentiel) et les évaluations (Indicateurs validés).
 */
export const getApprenticeTSF = cache(async (contractId: string) => {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    // 1. Récupérer le contrat pour connaître le référentiel lié
    const contract = await db.contract.findUnique({
        where: { id: contractId },
        select: { referentielId: true, userId: true }
    })

    if (!contract || !contract.referentielId) {
        throw new Error("Contrat introuvable ou sans référentiel associé")
    }

    // 2. Le "Grand Select" - Récupérer la hiérarchie + Evaluations
    const tsf = await db.referentiel.findUnique({
        where: { id: contract.referentielId },
        include: {
            blocs: {
                orderBy: { orderIndex: 'asc' }, // ou title si pas d'index
                include: {
                    competences: {
                        orderBy: { id: 'asc' }, // ou orderIndex si dispo
                        include: {
                            indicateurs: {
                                orderBy: { description: 'asc' },
                                include: {
                                    evaluations: {
                                        where: { contractId: contractId },
                                        select: {
                                            status: true,
                                            checkedAt: true,
                                            validatorId: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    })

    if (!tsf) throw new Error("Référentiel introuvable")

    // 3. Calcul du KPI : Taux de progression global
    const totalIndicators = await db.indicateur.count({
        where: {
            competence: {
                bloc: {
                    referentielId: contract.referentielId
                }
            }
        }
    })

    const validatedIndicators = await db.evaluationIndicateur.count({
        where: {
            contractId: contractId,
            status: "ACQUIS"
        }
    })

    const progress = totalIndicators > 0 ? Math.round((validatedIndicators / totalIndicators) * 100) : 0

    return {
        referentiel: tsf,
        progress,
        contractId
    }
})

/**
 * Valide ou invalide un indicateur (Toggle)
 */
export async function toggleIndicator(contractId: string, indicateurId: string, status: "ACQUIS" | "PENDING") {
    const session = await auth()
    if (!session?.user) return { error: "Non connecté" }

    // Fetch contract to get apprentice ID
    const contract = await db.contract.findUnique({
        where: { id: contractId },
        select: { userId: true }
    })

    // Safety check mostly for TS, though contractId *should* be valid
    const apprenticeId = contract?.userId

    try {
        if (status === "PENDING") {
            // Delete evaluation if setting back to pending
            // This is cleaner for "Undo", though keeping history (IN_PROGRESS) might be better later.
            await db.evaluationIndicateur.deleteMany({
                where: {
                    contractId,
                    indicateurId
                }
            })
        } else {
            // Upsert evaluation
            await db.evaluationIndicateur.upsert({
                where: {
                    contractId_indicateurId: {
                        contractId,
                        indicateurId
                    }
                },
                update: {
                    status: "ACQUIS",
                    checkedAt: new Date(),
                    validatorId: session.user.id,
                    // If apprenticeId was missing before, add it now (rare case of migration)
                    ...(apprenticeId && { apprenticeId })
                },
                create: {
                    contractId,
                    indicateurId,
                    status: "ACQUIS",
                    checkedAt: new Date(),
                    validatorId: session.user.id,
                    apprenticeId: apprenticeId || undefined
                }
            })
        }

        return { success: true }
    } catch (e: any) {
        console.error("Evaluation Error:", e)
        return { error: "Erreur lors de la mise à jour" }
    }
}

/**
 * Calcule la progression par Bloc de compétences pour un dashboard.
 */
export async function getContractProgress(contractId: string) {
    // 1. Get Referentiel ID from contract
    const contract = await db.contract.findUnique({
        where: { id: contractId },
        select: { referentielId: true }
    })

    if (!contract?.referentielId) return []

    // 2. Fetch Blocks with Indicators and User's Evaluations
    const blocs = await db.blocCompetence.findMany({
        where: { referentielId: contract.referentielId },
        include: {
            competences: {
                include: {
                    indicateurs: {
                        include: {
                            evaluations: {
                                where: {
                                    contractId: contractId,
                                    status: "ACQUIS"
                                }
                            }
                        }
                    }
                }
            }
        },
        orderBy: { orderIndex: 'asc' }
    })

    // 3. Calculate Stats
    return blocs.map(bloc => {
        // Flatten all indicators for this block
        const allIndicators = bloc.competences.flatMap(c => c.indicateurs)
        const total = allIndicators.length

        // Count validated
        const acquired = allIndicators.filter(i => i.evaluations.length > 0).length

        const percentage = total > 0 ? Math.round((acquired / total) * 100) : 0

        return {
            blockId: bloc.id,
            blockTitle: bloc.title,
            percentage,
            stats: {
                total,
                acquired
            }
        }
    })
}

// --- NEW ACTIONS ---

export async function updatePeriodDate(periodId: string, startDate: Date, endDate: Date) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Non connecté" }

    // Admin-only check logic if needed, currently reusing standard auth
    // Ideally verify role === 'admin'

    try {
        await db.period.update({
            where: { id: periodId },
            data: {
                startDate,
                endDate
            }
        })
        revalidatePath('/admin/users')
        return { success: true }
    } catch (e) {
        console.error("Modify Period Error:", e)
        return { error: "Erreur lors de la mise à jour de la période" }
    }
}

export async function notifyStudentOfPeriod(periodId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Non connecté" }

    try {
        const period = await db.period.findUnique({
            where: { id: periodId },
            include: {
                contract: {
                    include: { user: true }
                }
            }
        })

        if (!period || !period.contract.user) return { error: "Données introuvables" }

        // Here we simulate sending an email or push notification
        // For now, we create a NotificationLog entry

        await (db as any).notificationLog.create({
            data: {
                recipientId: period.contract.userId!,
                type: 'PUSH',
                title: 'Nouveaux objectifs définis 🎯',
                content: `Votre plan de formation pour la période "${period.label}" (${period.startDate.toLocaleDateString()} - ${period.endDate.toLocaleDateString()}) est prêt.`,
                metadata: JSON.stringify({ periodId: period.id })
            }
        })

        return { success: true }
    } catch (e) {
        console.error("Notify Error:", e)
        return { error: "Erreur lors de l'envoi" }
    }
}
