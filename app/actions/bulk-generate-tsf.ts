'use server'

import { auth } from '@/auth'
import db from '@/lib/db'
import { internalGenerateTSF } from './generate-tsf'
import { revalidatePath } from 'next/cache'
import { logAuditEvent } from './audit'

export async function generateTSFForPromotion(promotionId: string) {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    try {
        // 0. Fetch Promotion Dates
        const promotion = await db.promotion.findUnique({
            where: { id: promotionId }
        })

        if (!promotion) throw new Error("Promotion introuvable")

        // 1. Fetch Students in Promotion
        const students = await db.user.findMany({
            where: {
                role: 'apprentice',
                promotionId: promotionId
            },
            include: {
                contracts: {
                    where: {
                        // We probably want the active contract or let internalGenerateTSF handle logic
                        // Let's filter for active ones manually if needed, or just take the latest
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        })

        if (students.length === 0) return { success: true, count: 0, message: "Aucun étudiant dans cette promotion." }

        let successCount = 0
        let failCount = 0

        // 2. Loop and Generate
        for (const student of students) {
            const contract = student.contracts[0]
            if (contract) {
                // Pass Promotion Dates to enforce standard planning
                const result = await internalGenerateTSF(contract.id, promotion.startDate, promotion.endDate)
                if (result.success) successCount++
                else failCount++
            } else {
                failCount++ // No contract to generate for
            }
        }

        await logAuditEvent("GENERATE_BULK_TSF", "Promotion", promotionId, { successCount, failCount });

        revalidatePath(`/admin/promotions/${promotionId}`)

        return {
            success: true,
            count: successCount,
            failed: failCount,
            message: `${successCount} TSF générés avec succès (${failCount} échecs)`
        }

    } catch (e: any) {
        console.error("Bulk Generation Error:", e)
        return { success: false, error: e.message }
    }
}
