'use server'

import { auth } from '@/auth'
import db from '@/lib/db'
import { revalidatePath } from 'next/cache'

// --- Types ---
export type OfferFormData = {
    title: string
    description?: string
    status: string
    price: number
    funding?: string
    startDate: string | Date
    endDate: string | Date
    duration: number
    campus?: string
    seats?: number
    referentielId: string
}

// --- Actions ---

export async function getOffers() {
    const session = await auth()
    if (!session?.user?.tenantId) return []

    // If Super Admin, show all? Or just scoped? Usually scoped to tenant unless specific view.
    // For now, let's assume we are in the context of a CFA Admin.
    return await db.trainingOffer.findMany({
        where: { tenantId: session.user.tenantId as string },
        include: {
            referentiel: {
                select: { codeRncp: true, title: true }
            },
            _count: {
                select: { leads: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    })
}

export async function getOffersByReferentiel(referentielId: string) {
    const session = await auth()
    if (!session?.user?.id) return []

    return await db.trainingOffer.findMany({
        where: {
            referentielId,
            tenantId: session.user.tenantId as string // Security scope
        },
        orderBy: { startDate: 'asc' }
    })
}

export async function createOffer(data: OfferFormData) {
    const session = await auth()
    if (!session?.user?.tenantId) return { success: false, error: "Non autorisé" }

    try {
        const offer = await db.trainingOffer.create({
            data: {
                ...data,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                tenantId: session.user.tenantId
            }
        })

        revalidatePath('/admin/offres')
        revalidatePath(`/admin/referentiels/${data.referentielId}`)
        return { success: true, data: offer }
    } catch (error) {
        console.error("Error creating offer:", error)
        return { success: false, error: "Erreur lors de la création de l'offre" }
    }
}

export async function updateOffer(id: string, data: Partial<OfferFormData>) {
    const session = await auth()
    if (!session?.user?.tenantId) return { success: false, error: "Non autorisé" }

    try {
        // Verify ownership
        const existing = await db.trainingOffer.findUnique({ where: { id } })
        if (!existing || existing.tenantId !== session.user.tenantId) {
            return { success: false, error: "Offre introuvable ou accès refusé" }
        }

        const offer = await db.trainingOffer.update({
            where: { id },
            data: {
                ...data,
                startDate: data.startDate ? new Date(data.startDate) : undefined,
                endDate: data.endDate ? new Date(data.endDate) : undefined,
            }
        })

        revalidatePath('/admin/offres')
        return { success: true, data: offer }
    } catch (error) {
        console.error("Error updating offer:", error)
        return { success: false, error: "Erreur lors de la modification" }
    }
}

export async function deleteOffer(id: string) {
    const session = await auth()
    if (!session?.user?.tenantId) return { success: false, error: "Non autorisé" }

    try {
        const existing = await db.trainingOffer.findUnique({ where: { id } })
        if (!existing || existing.tenantId !== session.user.tenantId) {
            return { success: false, error: "Offre introuvable" }
        }

        await db.trainingOffer.delete({ where: { id } })
        revalidatePath('/admin/offres')
        return { success: true }
    } catch (error) {
        return { success: false, error: "Erreur lors de la suppression" }
    }
}
