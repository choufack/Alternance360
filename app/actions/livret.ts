'use server'

import db from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { auth } from '@/auth'
import { dispatchWebhook } from '@/lib/webhooks'
import { revalidatePath } from 'next/cache'
import { logAuditEvent } from './audit'

export interface LivretData {
    documentId: string
    generatedAt: Date
    // Contract & User
    contract: {
        id: string
        startDate: Date
        endDate: Date
    }
    apprentice: {
        fullName: string
        email: string
    }
    tenant: {
        name: string
        logoUrl?: string | null
        primaryColor?: string | null
    }
    // Progression
    blocs: {
        id: string
        code: string
        title: string
        competences: {
            id: string
            description: string
            status: string // PENDING, ACQUIS, NON_ACQUIS
        }[]
        validatedCount: number
        totalCount: number
    }[]
    // Journal Entries
    journalEntries: {
        id: string
        title: string
        createdAt: Date
        type: string
    }[]
    // Milestones
    milestones: {
        id: string
        label: string
        dueDate: Date
        status: string
        completedAt?: Date | null
    }[]
    // Stats
    stats: {
        totalCompetences: number
        validatedCompetences: number
        progressPercent: number
        blocsValidated: number
        totalBlocs: number
    }
}

export async function consolidateLivretData(contractId: string): Promise<LivretData | null> {
    const contract = await db.contract.findUnique({
        where: { id: contractId },
        include: {
            user: true,
            tenant: true,
            referentiel: {
                include: {
                    blocs: {
                        include: {
                            competences: true
                        }
                    }
                }
            },
            tsfMapping: {
                include: {
                    competence: true
                }
            },
            milestones: true
        }
    })

    if (!contract || !contract.user) return null

    // Fetch proofs (journal entries)
    const proofs = await db.proof.findMany({
        where: { userId: contract.user.id },
        orderBy: { createdAt: 'desc' },
        take: 20
    })

    // Process blocs and competences with TSF status
    const statusMap = new Map(contract.tsfMapping.map(m => [m.competenceId, m.status]))

    const blocs = contract.referentiel?.blocs.map(bloc => {
        const competences = bloc.competences.map(c => ({
            id: c.id,
            description: c.description,
            status: statusMap.get(c.id) || 'PENDING'
        }))
        const validatedCount = competences.filter(c => c.status === 'ACQUIS').length
        return {
            id: bloc.id,
            code: (bloc as any).code || bloc.title.substring(0, 10), // Fallback if code is missing
            title: bloc.title,
            competences,
            validatedCount,
            totalCount: competences.length
        }
    }) || []

    const totalCompetences = blocs.reduce((acc, b) => acc + b.totalCount, 0)
    const validatedCompetences = blocs.reduce((acc, b) => acc + b.validatedCount, 0)
    const blocsValidated = blocs.filter(b => b.validatedCount === b.totalCount && b.totalCount > 0).length

    return {
        documentId: uuidv4().split('-')[0].toUpperCase(),
        generatedAt: new Date(),
        contract: {
            id: contract.id,
            startDate: contract.startDate,
            endDate: contract.endDate
        },
        apprentice: {
            fullName: contract.user.fullName || 'Apprenti',
            email: contract.user.email
        },
        tenant: {
            name: contract.tenant.name,
            logoUrl: contract.tenant.logoUrl,
            primaryColor: contract.tenant.primaryColor
        },
        blocs,
        journalEntries: proofs.map(p => ({
            id: p.id,
            title: p.title,
            createdAt: p.createdAt,
            type: p.type
        })),
        milestones: contract.milestones.map(m => ({
            id: m.id,
            label: m.label,
            dueDate: m.dueDate,
            status: m.status,
            completedAt: m.completedAt
        })),
        stats: {
            totalCompetences,
            validatedCompetences,
            progressPercent: totalCompetences > 0 ? Math.round((validatedCompetences / totalCompetences) * 100) : 0,
            blocsValidated,
            totalBlocs: blocs.length
        }
    }
}

/**
 * Marks a livret as SIGNED and triggers the outgoing webhook.
 */
export async function signLivretAction(livretId: string) {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    const livret = await db.livret.findUnique({
        where: { id: livretId },
        include: {
            contract: {
                include: {
                    user: true
                }
            },
            tenant: true
        }
    })

    if (!livret) throw new Error("Livret not found")
    if (livret.tenantId !== session.user.tenantId) throw new Error("Unauthorized tenant")

    // 1. Update DB
    const updatedLivret = await db.livret.update({
        where: { id: livretId },
        data: {
            status: 'SIGNED',
            signedAt: new Date()
        } as any
    })

    await logAuditEvent("SIGN_LIVRET", "Livret", livretId, { contractId: livret.contractId });

    // 2. Calculate final progress (re-using consolidate logic or simple stats)
    const data = await consolidateLivretData(livret.contractId)
    const progressScore = data?.stats.progressPercent || 0

    // 3. Dispatch Webhook
    dispatchWebhook(livret.tenant, 'LIVRET_SIGNED', {
        livretId: livret.id,
        apprenticeExternalId: (livret.contract.user as any)?.externalId || null,
        apprenticeEmail: livret.contract.user?.email,
        downloadUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}${livret.filePath}`,
        progressScore,
        signedAt: (updatedLivret as any).signedAt
    }).catch(err => console.error("Webhook Dispatch Failed:", err))

    revalidatePath('/dashboard')
    revalidatePath(`/admin/users/${livret.contract.userId}`)

    return { success: true, signedAt: (updatedLivret as any).signedAt }
}
