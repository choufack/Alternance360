"use server"

import { auth } from "@/auth"
import db from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { logAuditEvent } from "./audit"

// --- Schemas ---
const CreateTicketSchema = z.object({
    subject: z.string().min(5),
    category: z.enum(["GENERAL", "TECH", "BILLING", "PEDAGOGY"]),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
    message: z.string().min(10)
})

const ReplyTicketSchema = z.object({
    ticketId: z.string(),
    content: z.string().min(1)
})

// --- Actions ---

export async function createTicket(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session?.user?.id || !session?.user?.tenantId) return { error: "Non autorisé" }

    const validated = CreateTicketSchema.safeParse({
        subject: formData.get('subject'),
        category: formData.get('category'),
        priority: formData.get('priority'),
        message: formData.get('message')
    })

    if (!validated.success) return { error: "Données invalides" }

    try {
        const ticket = await db.supportTicket.create({
            data: {
                subject: validated.data.subject,
                category: validated.data.category,
                priority: validated.data.priority,
                tenantId: session.user.tenantId,
                messages: {
                    create: {
                        content: validated.data.message,
                        authorId: session.user.id
                    }
                }
            }
        })

        await logAuditEvent("CREATE_TICKET", "SupportTicket", ticket.id, { subject: validated.data.subject });

        revalidatePath('/dashboard/support')
        return { success: true, ticketId: ticket.id }
    } catch (e) {
        console.error(e)
        return { error: "Erreur serveur" }
    }
}

export async function replyToTicket(ticketId: string, content: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Non autorisé" }

    try {
        const ticket = await db.supportTicket.findUnique({ where: { id: ticketId } })
        if (!ticket) return { error: "Ticket introuvable" }

        // RBAC: Must be Admin OR the Tenant owner
        const isAdmin = ['super_admin', 'admin'].includes(session.user.role!) // 'admin' here usually means platform admin, but in this logic 'admin' is Tenant Admin. Wait. Super Admin is Platform.
        // If user is basic user, check tenantId.

        // Actually, simple check: if not super_admin, must belong to tenant
        if (session.user.role !== 'super_admin' && session.user.tenantId !== ticket.tenantId) {
            return { error: "Accès refusé" }
        }

        await db.ticketMessage.create({
            data: {
                content,
                ticketId,
                authorId: session.user.id
            }
        })

        await logAuditEvent("REPLY_TO_TICKET", "SupportTicket", ticketId);

        // Auto-update status if Admin replies
        if (session.user.role === 'super_admin' && ticket.status === 'OPEN') {
            await db.supportTicket.update({
                where: { id: ticketId },
                data: { status: 'IN_PROGRESS' }
            })
            await logAuditEvent("UPDATE_TICKET_STATUS", "SupportTicket", ticketId, { status: 'IN_PROGRESS' });
        }

        // Auto-update status if Tenant replies (re-open?)
        // Keep simple for now.

        revalidatePath(`/dashboard/support/${ticketId}`) // Tenant view
        revalidatePath(`/super-admin/support/${ticketId}`) // Admin view
        return { success: true }
    } catch (e) {
        return { error: "Erreur lors de l'envoi" }
    }
}

export async function getTenantTickets() {
    const session = await auth()
    if (!session?.user?.tenantId) return []

    return await db.supportTicket.findMany({
        where: { tenantId: session.user.tenantId },
        orderBy: { updatedAt: 'desc' },
        include: {
            _count: { select: { messages: true } }
        }
    })
}

export async function getAllTickets() {
    const session = await auth()
    if (session?.user?.role !== 'super_admin') return []

    return await db.supportTicket.findMany({
        orderBy: { updatedAt: 'desc' },
        include: {
            tenant: { select: { name: true } },
            _count: { select: { messages: true } }
        }
    })
}

export async function getTicketDetails(id: string) {
    const session = await auth()
    if (!session?.user) return null

    const ticket = await db.supportTicket.findUnique({
        where: { id },
        include: {
            messages: {
                include: { author: { select: { fullName: true, role: true } } },
                orderBy: { createdAt: 'asc' }
            },
            tenant: { select: { name: true } }
        }
    })

    if (!ticket) return null

    // Secure Access
    if (session.user.role !== 'super_admin' && session.user.tenantId !== ticket.tenantId) {
        return null
    }

    return ticket
}

export async function updateTicketStatus(id: string, status: string) {
    const session = await auth()
    if (session?.user?.role !== 'super_admin') return { error: "Non autorisé" }

    await db.supportTicket.update({
        where: { id },
        data: { status }
    })

    await logAuditEvent("UPDATE_TICKET_STATUS", "SupportTicket", id, { status });

    revalidatePath(`/super-admin/support`)
    return { success: true }
}
