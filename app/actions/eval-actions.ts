
'use server'

import db from '@/lib/db'
import { createHash, randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { sendEmailToTutor } from '@/lib/mail'

interface EvaluationPayload {
    token: string
    contractId: string
    periodId: string
    evaluations: Record<string, { status: string, comment: string }>
}

export async function submitEvaluationAction(payload: EvaluationPayload) {
    const { token, contractId, periodId, evaluations } = payload

    try {
        // 1. Verify Token
        const tokenHash = createHash('sha256').update(token).digest('hex')
        const magicToken = await db.magicToken.findUnique({
            where: { tokenHash },
            include: {
                contract: {
                    include: {
                        user: true,
                        tutor: true
                    }
                }
            }
        })

        if (!magicToken || magicToken.contractId !== contractId || new Date() > magicToken.expiresAt) {
            return { success: false, error: "Lien invalide ou expiré." }
        }

        const apprentice = magicToken.contract.user
        const tutor = magicToken.contract.tutor

        if (!apprentice) return { success: false, error: "Apprenti introuvable." }

        // 2. Save Evaluations (at Competence level)
        const entries = Object.entries(evaluations)
        for (const [competenceId, data] of entries) {
            await (db as any).evaluationCompetence.upsert({
                where: {
                    contractId_competenceId: {
                        contractId,
                        competenceId
                    }
                },
                update: {
                    status: data.status,
                    comment: data.comment,
                    updatedAt: new Date(),
                    apprenticeId: apprentice.id // Ensure apprenticeId is set if null
                },
                create: {
                    contractId,
                    competenceId,
                    apprenticeId: apprentice.id,
                    status: data.status,
                    comment: data.comment
                }
            })
        }

        // 3. Mark signature (We can use Livret or another field, but for now let's just log it or update contract)
        // Optimization: In a real app, we might create a 'Submission' record.

        // 4. Notify Tutor
        if (tutor && tutor.email) {
            // Generate a NEW token for the tutor
            const rawTutorToken = randomBytes(32).toString('hex')
            const tutorTokenHash = createHash('sha256').update(rawTutorToken).digest('hex')

            await db.magicToken.create({
                data: {
                    tokenHash: tutorTokenHash,
                    type: 'TUTOR_ACCESS',
                    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
                    userId: tutor.id,
                    contractId: contractId
                }
            })

            await sendEmailToTutor(
                { firstName: tutor.firstName || 'Tuteur', email: tutor.email },
                `${apprentice.firstName} ${apprentice.lastName}`,
                rawTutorToken
            )
        }

        revalidatePath(`/apprentis/${token}/eval`)
        return { success: true }

    } catch (e: any) {
        console.error("Submit Evaluation Error:", e)
        return { success: false, error: "Erreur lors de la sauvegarde." }
    }
}
