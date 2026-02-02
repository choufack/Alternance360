"use server"

import { auth, update } from "@/auth"
import db from "@/lib/db"
import { logAuditEvent } from "./audit"
import { revalidatePath } from "next/cache"

export async function startImpersonation(targetUserId: string) {
    const session = await auth()

    // Safety check: Only super_admin or already impersonating (to switch)
    if (!session || (session.user.role !== 'super_admin' && !session.user.isImpersonating)) {
        throw new Error("Non autorisé")
    }

    const targetUser = await db.user.findUnique({
        where: { id: targetUserId },
        select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            tenantId: true
        }
    })

    if (!targetUser) throw new Error("Utilisateur non trouvé")

    // Capture the original super admin ID if not already impersonating
    const originalUserId = session.user.originalUserId || session.user.id

    await update({
        user: {
            id: targetUser.id,
            email: targetUser.email,
            name: targetUser.fullName,
            role: targetUser.role,
            tenantId: targetUser.tenantId,
        },
        isImpersonating: true,
        originalUserId: originalUserId
    })

    await logAuditEvent('SUPER_ADMIN_IMPERSONATION_START', 'User', targetUserId, {
        adminId: originalUserId
    })

    revalidatePath('/')
    return { success: true }
}

export async function stopImpersonation() {
    const session = await auth()
    if (!session || !session.user.isImpersonating) return { success: false }

    const originalUserId = session.user.originalUserId
    if (!originalUserId) throw new Error("ID d'origine introuvable")

    const originalUser = await db.user.findUnique({
        where: { id: originalUserId }
    })

    if (!originalUser) throw new Error("Administrateur d'origine non trouvé")

    await update({
        user: {
            id: originalUser.id,
            email: originalUser.email,
            name: originalUser.fullName,
            role: originalUser.role,
            tenantId: originalUser.tenantId,
        },
        isImpersonating: false,
        originalUserId: undefined
    })

    await logAuditEvent('SUPER_ADMIN_IMPERSONATION_STOP', 'User', originalUserId, {
        adminId: originalUserId
    })

    revalidatePath('/')
    return { success: true }
}
