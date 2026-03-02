'use server'

import db from '@/lib/db'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { logAuditEvent } from './audit'

export async function generateTSF(contractId: string) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')

    const result = await internalGenerateTSF(contractId)
    if (result.success) {
        await logAuditEvent("GENERATE_TSF", "Contract", contractId);
        revalidatePath(`/dashboard/contracts/${contractId}`)
    }
    return result
}

/**
 * Internal logic for TSF Generation.
 * Can be called by API routes or background tasks.
 */
export async function internalGenerateTSF(contractId: string, overrideStartDate?: Date, overrideEndDate?: Date) {
    try {
        // 1. Fetch Contract
        const contract = await db.contract.findUnique({
            where: { id: contractId },
            include: { referentiel: true, user: true }
        })

        if (!contract) throw new Error('Contract not found')

        // 2. Generate Periods (Algorithm: 6 months slices)
        const startDate = overrideStartDate || new Date(contract.startDate)
        const endDate = overrideEndDate || new Date(contract.endDate)

        if (startDate >= endDate) {
            throw new Error(`Dates invalides : la date de début (${startDate.toLocaleDateString()}) doit être avant la date de fin (${endDate.toLocaleDateString()}).`)
        }

        const durationMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth())
        const nbPeriods = Math.max(1, Math.ceil(durationMonths / 6))
        const periodsIds: string[] = []

        // Perform everything in a transaction for safety
        await db.$transaction(async (tx) => {
            // Clean existing periods
            await tx.period.deleteMany({ where: { contractId } })

            let internalDate = new Date(startDate)
            for (let i = 1; i <= nbPeriods; i++) {
                const periodEnd = new Date(internalDate)
                periodEnd.setMonth(periodEnd.getMonth() + 6)

                // Ensure the last period ends exactly at the contract end date
                // and that we don't create periods starting after the end date
                if (internalDate >= endDate && i > 1) break;

                const actualEnd = (periodEnd > endDate || i === nbPeriods) ? endDate : periodEnd

                const p = await tx.period.create({
                    data: {
                        contractId,
                        orderIndex: i,
                        label: `Période ${i} (Semestre)`,
                        startDate: internalDate,
                        endDate: actualEnd
                    }
                })

                periodsIds.push(p.id)
                internalDate = periodEnd
            }

            // 3. Fetch Positionnement (Initial Diagnostics)
            if (contract.userId && contract.referentielId) {
                const positions = await tx.positioning.findMany({
                    where: { userId: contract.userId },
                    select: { competenceId: true, levelInitial: true }
                })

                const acquisMap = new Set<string>()
                positions.forEach(p => {
                    if (p.levelInitial >= 3) acquisMap.add(p.competenceId)
                })

                // 4. Fetch Referentiel Structure
                const blocs = await tx.blocCompetence.findMany({
                    where: { referentielId: contract.referentielId },
                    include: { competences: true },
                    orderBy: { orderIndex: 'asc' }
                })

                // 5. Distribute Competences
                const inserts: any[] = []
                const nbBlocs = blocs.length || 1

                blocs.forEach((bloc: any, index: number) => {
                    const periodIndexRaw = Math.floor((index / nbBlocs) * periodsIds.length)
                    const targetPeriodId = periodsIds[Math.min(periodIndexRaw, periodsIds.length - 1)]

                    bloc.competences.forEach((comp: any) => {
                        const isAcquis = acquisMap.has(comp.id)

                        inserts.push({
                            contractId,
                            competenceId: comp.id,
                            periodId: targetPeriodId, // Actually assign the period
                            status: isAcquis ? 'ACQUIS' : 'PENDING',
                            flagCfa: !isAcquis,
                            flagEntreprise: !isAcquis
                        })
                    })
                })

                // 6. Bulk Insert
                await tx.tSFMapping.deleteMany({ where: { contractId } })
                if (inserts.length > 0) {
                    await tx.tSFMapping.createMany({
                        data: inserts
                    })
                }
            }
        })

        return { success: true }

    } catch (e: any) {
        console.error('TSF Generation Failed:', e)
        return { success: false, error: e.message }
    }
}
