'use server'

import db from '@/lib/db'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { logAuditEvent } from './audit'

export type RemediationAction = {
    title: string
    dueDate: string
    status: 'PENDING' | 'DONE'
}

/**
 * Creates a new remediation plan for a contract
 */
export async function createRemediationPlan(contractId: string, triggerReason: string) {
    const session = await auth()
    if (!session?.user?.id || !['admin', 'formateur'].includes(session.user.role)) {
        throw new Error("Unauthorized")
    }

    const contract = await db.contract.findUnique({
        where: { id: contractId },
        select: { tenantId: true }
    })

    if (!contract) throw new Error("Contract not found")

    const plan = await db.remediationPlan.create({
        data: {
            contractId,
            triggerReason,
            tenantId: contract.tenantId,
            createdById: session.user.id,
            status: 'DRAFT',
            actions: '[]'
        }
    })

    await logAuditEvent("CREATE_REMEDIATION_PLAN", "RemediationPlan", plan.id, { contractId, triggerReason });

    revalidatePath('/admin/remediation')
    return { success: true, planId: plan.id }
}

/**
 * Adds an action step to an existing plan
 */
export async function addRemediationAction(planId: string, action: RemediationAction) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const plan = await db.remediationPlan.findUnique({ where: { id: planId } })
    if (!plan) throw new Error("Plan not found")

    const actions: RemediationAction[] = JSON.parse(plan.actions)
    actions.push(action)

    await db.remediationPlan.update({
        where: {
            id: planId,
            tenantId: session.user.tenantId // Security
        },
        data: {
            actions: JSON.stringify(actions),
            status: 'IN_PROGRESS'
        }
    })

    await logAuditEvent("ADD_REMEDIATION_ACTION", "RemediationPlan", planId, action);

    revalidatePath('/admin/remediation')
    return { success: true }
}

/**
 * Marks an action as complete
 */
export async function completeRemediationAction(planId: string, actionIndex: number) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const plan = await db.remediationPlan.findUnique({ where: { id: planId } })
    if (!plan) throw new Error("Plan not found")

    const actions: RemediationAction[] = JSON.parse(plan.actions)
    if (actionIndex >= actions.length) throw new Error("Invalid action index")

    actions[actionIndex].status = 'DONE'

    await db.remediationPlan.update({
        where: {
            id: planId,
            tenantId: session.user.tenantId // Security
        },
        data: { actions: JSON.stringify(actions) }
    })

    await logAuditEvent("COMPLETE_REMEDIATION_ACTION", "RemediationPlan", planId, { actionIndex });

    revalidatePath('/admin/remediation')
    return { success: true }
}

/**
 * Resolves (closes) a remediation plan
 */
export async function resolveRemediationPlan(planId: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    await db.remediationPlan.update({
        where: {
            id: planId,
            tenantId: session.user.tenantId // Security
        },
        data: {
            status: 'RESOLVED',
            resolvedAt: new Date()
        }
    })

    await logAuditEvent("RESOLVE_REMEDIATION_PLAN", "RemediationPlan", planId);

    revalidatePath('/admin/remediation')
    return { success: true }
}

/**
 * Lists all remediation plans for the current tenant
 */
export async function getRemediationsForTenant(status?: string) {
    const session = await auth()
    if (!session?.user?.tenantId) throw new Error("Unauthorized")

    const plans = await db.remediationPlan.findMany({
        where: {
            tenantId: session.user.tenantId,
            ...(status ? { status } : {})
        },
        include: {
            contract: {
                include: {
                    user: { select: { fullName: true, email: true } }
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    return plans.map(p => ({
        ...p,
        actions: JSON.parse(p.actions) as RemediationAction[]
    }))
}

/**
 * Gets contracts that need attention (WARNING or DANGER status)
 */
export async function getContractsNeedingRemediation() {
    const session = await auth()
    if (!session?.user?.tenantId) throw new Error("Unauthorized")

    const contracts = await db.contract.findMany({
        where: { tenantId: session.user.tenantId },
        include: {
            user: { select: { fullName: true, email: true } },
            remediationPlans: { where: { status: { not: 'RESOLVED' } } }
        }
    })

    // We'll compute health scores here
    const { getContractHealth } = await import('./monitoring')

    const atRisk = []
    for (const c of contracts) {
        const health = await getContractHealth(c.id)
        if (health && health.status !== 'GOOD') {
            atRisk.push({
                contract: c,
                health,
                hasActivePlan: c.remediationPlans.length > 0
            })
        }
    }

    return atRisk
}
