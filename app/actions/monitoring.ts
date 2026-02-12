'use server'

import db from '@/lib/db'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { addDays, addMonths, differenceInDays, format } from 'date-fns'
import { logAuditEvent } from './audit'

/**
 * Automatically generates mandatory milestones for a contract
 */
export async function syncMilestones(contractId: string) {
    const contract = await db.contract.findUnique({
        where: { id: contractId },
        include: { milestones: true }
    })

    const session = await auth();
    if (!contract || (session?.user?.tenantId && contract.tenantId !== session.user.tenantId)) {
        return { error: "Contract not found or unauthorized" }
    }

    // Define mandatory milestones
    const mandatory = [
        { type: 'START_INTERVIEW', label: 'Entretien de début de parcours (J+7)', days: 7 },
        { type: 'PROBATION_REVIEW', label: 'Bilan de fin de période d\'essai (J+45)', days: 45 },
    ]

    const existingTypes = contract.milestones.map(m => m.type)
    const newMilestones = []

    for (const m of mandatory) {
        if (!existingTypes.includes(m.type)) {
            newMilestones.push({
                type: m.type,
                label: m.label,
                dueDate: addDays(new Date(contract.startDate), m.days),
                contractId
            })
        }
    }

    // Semi-annual reviews (every 6 months)
    let months = 6
    while (addMonths(new Date(contract.startDate), months) < new Date(contract.endDate)) {
        const type = `SEMESTER_REVIEW_${months}`
        if (!existingTypes.includes(type)) {
            newMilestones.push({
                type,
                label: `Bilan semestriel (${months} mois)`,
                dueDate: addMonths(new Date(contract.startDate), months),
                contractId
            })
        }
        months += 6
    }

    if (newMilestones.length > 0) {
        await db.milestone.createMany({
            data: newMilestones
        })
        await logAuditEvent("SYNC_MILESTONES", "Contract", contractId, { count: newMilestones.length });
    }

    return { success: true }
}

/**
 * Calculates the health score of a contract (Indicator 20 Qualiopi)
 * Returns a score from 0 to 100
 */
export async function getContractHealth(contractId: string) {
    const contract = await db.contract.findUnique({
        where: { id: contractId },
        include: {
            user: {
                include: {
                    proofs: { orderBy: { createdAt: 'desc' }, take: 1 }
                }
            },
            milestones: { where: { status: 'PENDING' } },
            attendance: true
        }
    })

    if (!contract || !contract.user) return null

    let score = 100
    const reasons: string[] = []

    // 1. Journal Frequency (-20 if no entry for 15 days)
    const lastProof = contract.user.proofs[0]
    if (lastProof) {
        const daysSinceLast = differenceInDays(new Date(), new Date(lastProof.createdAt))
        if (daysSinceLast > 15) {
            score -= 20
            reasons.push(`Journal de bord inactif depuis ${daysSinceLast} jours`)
        }
    } else {
        score -= 20
        reasons.push("Aucun journal de bord saisi")
    }

    // 2. Overdue Milestones (-30 per overdue)
    const now = new Date()
    const overdueMilestones = contract.milestones.filter(m => m.dueDate < now)
    if (overdueMilestones.length > 0) {
        score -= 30 * overdueMilestones.length
        reasons.push(`${overdueMilestones.length} jalon(s) réglementaire(s) dépassé(s)`)
    }

    // 3. Attendance (-10 if absence rate > 10%)
    const totalHours = contract.attendance.reduce((acc, curr) => acc + curr.hours, 0)
    const absentHours = contract.attendance
        .filter(a => a.status === 'ABSENT_UNJUSTIFIED')
        .reduce((acc, curr) => acc + curr.hours, 0)

    if (totalHours > 0) {
        const absenceRate = (absentHours / totalHours) * 100
        if (absenceRate > 10) {
            score -= 10
            reasons.push(`Taux d'absence injustifiée élevé (${absenceRate.toFixed(1)}%)`)
        }
    }

    // Clamp score
    const finalScore = Math.max(0, score)

    return {
        score: finalScore,
        reasons,
        status: finalScore > 70 ? 'GOOD' : finalScore > 40 ? 'WARNING' : 'DANGER'
    }
}

/**
 * Logs a notification for compliance trace
 */
export async function logNotification(recipientId: string, type: string, title: string, content: string) {
    return await db.notificationLog.create({
        data: {
            recipientId,
            type,
            title,
            content
        }
    })
}

/**
 * Record attendance
 */
export async function saveAttendance(data: {
    contractId: string,
    date: string,
    hours: number,
    status: 'PRESENT' | 'ABSENT_JUSTIFIED' | 'ABSENT_UNJUSTIFIED'
}) {
    const session = await auth();
    if (session?.user?.tenantId) {
        const contract = await db.contract.findUnique({ where: { id: data.contractId } });
        if (!contract || contract.tenantId !== session.user.tenantId) {
            throw new Error("Access denied");
        }
    }

    const res = await db.attendance.create({
        data: {
            ...data,
            date: new Date(data.date)
        }
    })

    await logAuditEvent("SAVE_ATTENDANCE", "Attendance", res.id, { contractId: data.contractId });

    revalidatePath('/admin/suivi')
    return res
}

/**
 * Daily check for alerts (Cron simulation)
 * Scans all contracts and sends notifications based on milestones
 */
export async function checkDailyAlerts() {
    const contracts = await db.contract.findMany({
        include: {
            milestones: { where: { status: 'PENDING' } },
            user: true
        }
    })

    const now = new Date()
    const logs = []

    for (const contract of contracts) {
        if (!contract.user) continue

        for (const milestone of contract.milestones) {
            const daysUntil = differenceInDays(new Date(milestone.dueDate), now)

            // Rappel simple : J-7
            if (daysUntil === 7) {
                logs.push(await logNotification(
                    contract.user.id,
                    'EMAIL',
                    `Rappel Jalon: ${milestone.label}`,
                    `Votre jalon "${milestone.label}" arrive à échéance dans 7 jours (${format(new Date(milestone.dueDate), 'd MMMM')}).`
                ))
            }

            // Alerte urgente : Jour J
            if (daysUntil === 0) {
                logs.push(await logNotification(
                    contract.user.id,
                    'PUSH',
                    `URGENT: Jalon ${milestone.label}`,
                    `Le jalon "${milestone.label}" est à compléter aujourd'hui.`
                ))
            }

            // Escalade : J+5
            if (daysUntil === -5) {
                // If the milestone is overdue, send to formateur/admin
                if (contract.formateurId) {
                    logs.push(await logNotification(
                        contract.formateurId,
                        'ALERT',
                        `ESCALADE: Jalon dépassé pour ${contract.user.fullName}`,
                        `L'apprenti a dépassé le jalon "${milestone.label}" de 5 jours.`
                    ))
                }
            }
        }
    }

    return { success: true, alertsSent: logs.length }
}
