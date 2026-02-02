'use server'

import db from '@/lib/db'
import { auth } from '@/auth'
import { generateText } from '@/lib/ai'
import { differenceInDays, addDays } from 'date-fns'

export type InactivityStat = {
    userId: string
    fullName: string
    email: string
    lastActivityDate: Date | null
    daysInactive: number
    status: 'DANGER' | 'WARNING' | 'GOOD'
}

export async function getApprenticeInactivity(): Promise<InactivityStat[]> {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const user = await db.user.findUnique({ where: { id: session.user.id } })
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'formateur')) {
        throw new Error("Forbidden")
    }

    // 1. Build Query for Apprentices
    const whereClause: any = { role: 'apprentice' }

    // If Formateur, filter by contracts
    if (user.role === 'formateur') {
        whereClause.contracts = {
            some: { formateurId: user.id }
        }
    }

    // 2. Fetch Apprentices with their latest Proof
    // Note: Prisma relation filtering is powerful.
    const apprentices = await db.user.findMany({
        where: whereClause,
        select: {
            id: true,
            fullName: true,
            email: true,
            proofs: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { createdAt: true }
            }
        }
    })

    // 3. Process Data
    const now = new Date()
    const stats: InactivityStat[] = apprentices.map(app => {
        const lastProof = app.proofs[0]
        const lastDate = lastProof ? new Date(lastProof.createdAt) : null

        let daysInactive = -1 // -1 means never active
        if (lastDate) {
            const diffTime = Math.abs(now.getTime() - lastDate.getTime())
            daysInactive = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        } else {
            // If never active, we can consider check creation date or just set to high number
            // For simplify, let's say 999
            daysInactive = 999
        }

        let status: 'DANGER' | 'WARNING' | 'GOOD' = 'GOOD'
        if (daysInactive > 7) status = 'DANGER'
        else if (daysInactive >= 3) status = 'WARNING'

        return {
            userId: app.id,
            fullName: app.fullName || "Sans nom",
            email: app.email,
            lastActivityDate: lastDate,
            daysInactive: daysInactive === 999 ? -1 : daysInactive, // Return -1 for UI "Never"
            status
        }
    })

    // 4. Sort: Danger first
    stats.sort((a, b) => {
        // Handle "Never" (-1) as highest priority for danger?
        // Let's treat -1 as infinity for sorting descending
        const valA = a.daysInactive === -1 ? 1000 : a.daysInactive
        const valB = b.daysInactive === -1 ? 1000 : b.daysInactive
        return valB - valA
    })

    return stats
}

import { getContractHealth } from './monitoring'

export type ContractHealthOverview = {
    contractId: string
    apprenticeName: string
    healthScore: number
    healthStatus: 'GOOD' | 'WARNING' | 'DANGER'
    reasons: string[]
}

export async function getContractsHealthOverview(filters?: GovernanceFilters): Promise<ContractHealthOverview[]> {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    // Get all contracts (filtered by formateur if applicable)
    const user = await db.user.findUnique({ where: { id: session.user.id } })
    const whereClause: any = {}
    if (session.user.tenantId) {
        whereClause.tenantId = session.user.tenantId
    }

    if (user?.role === 'formateur') {
        whereClause.formateurId = user.id
    }
    if (filters?.referentielId) whereClause.referentielId = filters.referentielId
    if (filters?.formateurId) whereClause.formateurId = filters.formateurId

    const contracts = await db.contract.findMany({
        where: whereClause,
        include: {
            user: { select: { fullName: true } }
        }
    })

    const overview: ContractHealthOverview[] = []

    for (const contract of contracts) {
        const health = await getContractHealth(contract.id)
        if (health) {
            overview.push({
                contractId: contract.id,
                apprenticeName: contract.user?.fullName || "Inconnu",
                healthScore: health.score,
                healthStatus: health.status as 'GOOD' | 'WARNING' | 'DANGER',
                reasons: health.reasons
            })
        }
    }

    return overview.sort((a, b) => a.healthScore - b.healthScore) // Worst first
}

export type WorkflowStat = {
    contractId: string
    apprenticeName: string
    step1: 'DONE' | 'PENDING' // Contract Created
    step2: 'DONE' | 'PENDING' // Assessment Completed
    step3: 'DONE' | 'PENDING' // TSF Validated
    blockedAt: number | null
}

export async function getWorkflowSupervision(): Promise<WorkflowStat[]> {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const contracts = await db.contract.findMany({
        where: session.user.tenantId ? { tenantId: session.user.tenantId } : {},
        include: {
            user: { select: { fullName: true } },
            initialAssessments: { select: { status: true } },
        }
    })

    return contracts.map(c => {
        const assessmentDone = c.initialAssessments.some(a => a.status === 'VALIDATED')
        const tsfValidated = (c as any).tsfStatus === 'VALIDATED'

        let blockedAt: number | null = null
        if (!assessmentDone) blockedAt = 2
        else if (!tsfValidated) blockedAt = 3

        return {
            contractId: c.id,
            apprenticeName: c.user?.fullName || "Inconnu",
            step1: 'DONE', // If contract exists, step 1 is done
            step2: assessmentDone ? 'DONE' : 'PENDING',
            step3: tsfValidated ? 'DONE' : 'PENDING',
            blockedAt
        }
    })
}

export type GovernanceKPIs = {
    activeApprentices: number
    j7CompletionRate: number
    j45Alerts: number
    globalRiskScore: number
    funnel: {
        contracts: number
        assessments: number
        tsfs: number
    }
}

export type GovernanceFilters = {
    referentielId?: string
    formateurId?: string
}

export async function getGouvernanceKPIs(filters?: GovernanceFilters): Promise<GovernanceKPIs> {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const tenantId = session.user.tenantId

    const contractWhere: any = {}
    if (tenantId) contractWhere.tenantId = tenantId

    if (filters?.referentielId) contractWhere.referentielId = filters.referentielId
    if (filters?.formateurId) contractWhere.formateurId = filters.formateurId

    // 1. Basic counts
    const apprenticeWhere: any = { role: 'apprentice' }
    if (tenantId) apprenticeWhere.tenantId = tenantId
    if (filters?.formateurId) apprenticeWhere.contracts = { some: { formateurId: filters.formateurId } }
    if (filters?.referentielId) apprenticeWhere.contracts = { some: { referentielId: filters.referentielId } }

    const totalApprentices = await db.user.count({ where: apprenticeWhere })

    const contracts = await db.contract.findMany({
        where: contractWhere,
        include: {
            initialAssessments: { select: { status: true } }
        }
    })

    // 2. J+7 Completion (Contracts with VALIDATED positionings)
    const j7Done = contracts.filter((c: any) => c.initialAssessments.some((a: any) => a.status === 'VALIDATED')).length
    const j7Rate = totalApprentices > 0 ? (j7Done / totalApprentices) * 100 : 0

    // 3. J+45 Alerts (Pending milestones type PROBATION_REVIEW overdue)
    const j45Where: any = {
        contract: { ...contractWhere },
        type: 'PROBATION_REVIEW',
        status: 'PENDING',
        dueDate: { lt: new Date() }
    }

    const overdueJ45 = await (db as any).milestone.count({
        where: j45Where
    })

    // 4. Global Risk Score
    let totalRisk = 0
    let countRisk = 0
    for (const c of contracts) {
        const health = await getContractHealth(c.id)
        if (health) {
            totalRisk += health.score
            countRisk++
        }
    }
    const avgRisk = countRisk > 0 ? totalRisk / countRisk : 100

    // 5. Funnel
    const funnelAssessments = contracts.filter((c: any) => c.initialAssessments.length > 0).length
    const funnelTsfs = contracts.filter(c => (c as any).tsfStatus === 'VALIDATED').length

    return {
        activeApprentices: totalApprentices,
        j7CompletionRate: Math.round(j7Rate),
        j45Alerts: overdueJ45,
        globalRiskScore: Math.round(avgRisk),
        funnel: {
            contracts: contracts.length,
            assessments: funnelAssessments,
            tsfs: funnelTsfs
        }
    }
}

export async function getGovernanceInsights(filters?: GovernanceFilters) {
    const kpis = await getGouvernanceKPIs(filters)

    const prompt = `
        En tant qu'expert en pilotage de CFA et conformité Qualiopi.
        Analyse les KPIs suivants pour ce mois :
        - Apprentis actifs : ${kpis.activeApprentices}
        - Taux de complétion J+7 : ${kpis.j7CompletionRate}%
        - Alertes J+45 (Fin période d'essai) : ${kpis.j45Alerts}
        - Score de santé global : ${kpis.globalRiskScore}/100
        
        Génère une phrase de synthèse stratégique (max 25 mots) mettant en avant soit un succès, soit une alerte critique (ex: chute de validation, retard administratif).
        Sois direct et percutant.
    `

    try {
        const insight = await generateText(prompt)
        return insight.trim()
    } catch (e) {
        return "Analyse indisponible pour le moment."
    }
}

export type ActivityEntry = {
    id: string
    title: string
    content: string
    createdAt: Date
}

export async function getActivityFeed(): Promise<ActivityEntry[]> {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    // Fetch latest notifications as activity feed for simplicity
    const logs = await (db as any).notificationLog.findMany({
        where: { recipientId: session.user.id }, // For admin, show their logs
        orderBy: { sentAt: 'desc' },
        take: 10
    })

    return logs.map((l: any) => ({
        id: l.id,
        title: l.title,
        content: l.content,
        createdAt: l.sentAt
    }))
}

export async function exportNonCompliantDossiers(filters?: GovernanceFilters) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const risks = await getContractsHealthOverview(filters)
    const nonCompliant = risks.filter(r => r.healthStatus !== 'GOOD')

    let csv = "Apprenti;Score de Sante;Status;Anomalies\n"
    for (const r of nonCompliant) {
        csv += `${r.apprenticeName};${r.healthScore}%;${r.healthStatus};"${r.reasons.join(', ')}"\n`
    }

    return csv
}
