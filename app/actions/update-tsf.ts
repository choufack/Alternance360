'use server'

import db from '@/lib/db'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

import { createHash } from 'crypto'

interface TSFUpdatePayload {
    mappingId?: string
    contractId: string
    competenceId: string
    periodId: string
    flag_cfa: boolean
    flag_entreprise: boolean
    token?: string
}

async function verifyAccess(contractId: string, token?: string) {
    const session = await auth()
    if (session?.user) return true

    if (token) {
        const tokenHash = createHash('sha256').update(token).digest('hex')
        const magicToken = await db.magicToken.findUnique({
            where: { tokenHash },
            select: { contractId: true, expiresAt: true }
        })

        if (magicToken && magicToken.contractId === contractId && new Date() <= magicToken.expiresAt) {
            return true
        }
    }

    return false
}

export async function updateTSFCell(payload: TSFUpdatePayload) {
    const { contractId, competenceId, periodId, flag_cfa, flag_entreprise, token } = payload

    const hasAccess = await verifyAccess(contractId, token)
    if (!hasAccess) throw new Error('Unauthorized')

    try {
        // Upsert Logic:
        await db.tSFMapping.upsert({
            where: {
                contractId_competenceId_periodId: {
                    contractId,
                    competenceId,
                    periodId
                }
            },
            update: {
                flagCfa: flag_cfa,
                flagEntreprise: flag_entreprise,
                status: 'PLANIFIE'
            },
            create: {
                contractId,
                competenceId,
                periodId,
                flagCfa: flag_cfa,
                flagEntreprise: flag_entreprise,
                status: 'PLANIFIE'
            }
        })

        revalidatePath(`/pedagogie/tsf`)
        revalidatePath(`/admin/promotions`) // For admins tracking progress
        return { success: true }
    } catch (e: any) {
        console.error('Update TSF Cell Failed:', e)
        return { success: false, error: e.message }
    }
}

export async function updateTSFDescription(contractId: string, competenceId: string, description: string, token?: string) {
    const hasAccess = await verifyAccess(contractId, token)
    if (!hasAccess) throw new Error('Unauthorized')

    try {
        // 1. Find existing mappings
        const mappings = await db.tSFMapping.findMany({
            where: {
                contractId,
                competenceId
            }
        })

        if (mappings.length === 0) {
            return { error: "Aucune entrée TSF trouvée pour cette compétence." }
        }

        // 2. Update all of them
        await db.tSFMapping.updateMany({
            where: {
                contractId,
                competenceId
            },
            data: {
                competenceDescription: description
            }
        })

        revalidatePath(`/pedagogie/tsf`)
        revalidatePath(`/admin/promotions`)
        return { success: true }

    } catch (e: any) {
        console.error('Update Description Failed:', e)
        return { error: "Erreur lors de la mise à jour" }
    }
}

export async function updateTSFStatusAndComment(payload: {
    contractId: string
    competenceId: string
    periodId: string
    status: string
    comment?: string
    token?: string
}) {
    const { contractId, competenceId, periodId, status, comment, token } = payload

    const hasAccess = await verifyAccess(contractId, token)
    if (!hasAccess) throw new Error('Unauthorized')

    try {
        await db.tSFMapping.update({
            where: {
                contractId_competenceId_periodId: {
                    contractId,
                    competenceId,
                    periodId
                }
            },
            data: {
                status,
                comment
            }
        })

        revalidatePath(`/pedagogie/tsf`)
        revalidatePath(`/admin/promotions`)
        return { success: true }
    } catch (e: any) {
        console.error('Update TSF Status Failed:', e)
        return { success: false, error: e.message }
    }
}
