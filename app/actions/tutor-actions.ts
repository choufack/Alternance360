'use server'

import { createHash } from 'crypto'
import db from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function validateEvaluationAction(
    token: string,
    evaluations: { competenceId: string, tutorStatus: string, tutorComment: string }[]
) {
    // 1. Verify Token
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const magicToken = await db.magicToken.findUnique({
        where: { tokenHash },
        include: { contract: true }
    })

    if (!magicToken || magicToken.type !== 'TUTOR_ACCESS' || new Date() > magicToken.expiresAt) {
        throw new Error('Token invalide ou expiré')
    }

    // 2. Update Evaluations
    for (const evaluation of evaluations) {
        await (db as any).evaluationCompetence.upsert({
            where: {
                contractId_competenceId: {
                    contractId: magicToken.contractId,
                    competenceId: evaluation.competenceId
                }
            },
            update: {
                tutorStatus: evaluation.tutorStatus,
                tutorComment: evaluation.tutorComment,
                tutorValidatedAt: new Date(),
                validatorId: magicToken.userId // The tutor is the user linked to the token
            },
            create: {
                contractId: magicToken.contractId,
                competenceId: evaluation.competenceId,
                tutorStatus: evaluation.tutorStatus,
                tutorComment: evaluation.tutorComment,
                tutorValidatedAt: new Date(),
                validatorId: magicToken.userId,
                apprenticeId: magicToken.contract.userId // Assuming the contract has the apprentice ID
            }
        })
    }

    revalidatePath(`/tutor/access/${token}`)
    return { success: true }
}
