'use server'

import db from '@/lib/db'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

interface TSFUpdatePayload {
    mappingId?: string
    contractId: string
    competenceId: string
    periodId: string
    flag_cfa: boolean
    flag_entreprise: boolean
}

export async function updateTSFCell(payload: TSFUpdatePayload) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')

    try {
        const { contractId, competenceId, periodId, flag_cfa, flag_entreprise } = payload

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

        revalidatePath(`/dashboard/contracts/${contractId}`)
        return { success: true }
    } catch (e: any) {
        console.error('Update TSF Cell Failed:', e)
        return { success: false, error: e.message }
    }
}

export async function updateTSFDescription(contractId: string, competenceId: string, description: string) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')

    try {
        // We need to update ALL mappings for this contract/competence to keep consistency
        // OR just update the ones that exist. 
        // If no mapping exists yet for a period, we can't store the description there yet unless we create a dummy one.
        // BETTER APPROACH: Find all existing mappings and update them.

        // 1. Find existing mappings
        const mappings = await db.tSFMapping.findMany({
            where: {
                contractId,
                competenceId
            }
        })

        if (mappings.length === 0) {
            // Edge case: No TSF cells active for this competence yet.
            // We might need to handle this by creating a placeholder or just erroring?
            // Actually, if TSF is generated, there should be mappings (even if flags are false).
            // If not, we can't save the custom description easily without a meaningful mapping record.
            // BUT, usually TSF is fully pre-generated with empty flags?
            // Let's assume we update any found.
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

        revalidatePath(`/admin/users`)
        return { success: true }

    } catch (e: any) {
        console.error('Update Description Failed:', e)
        return { error: "Erreur lors de la mise à jour" }
    }
}
