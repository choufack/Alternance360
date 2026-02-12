"use server";

import db from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { logAuditEvent } from "./audit";

// --- FILIERES ---

export async function createFiliere({ name, description, referentielId }: { name: string, description?: string, referentielId?: string }) {
    const session = await auth();
    if (!session?.user?.id || !session.user.tenantId) return { error: "Non autorisé" };

    try {
        const filiere = await db.filiere.create({
            data: {
                name,
                description,
                referentielId,
                tenantId: session.user.tenantId,
            },
        });

        await logAuditEvent("CREATE_FILIERE", "Filiere", filiere.id, { name });

        revalidatePath("/admin/filieres");
        return { success: true, data: filiere };
    } catch (error) {
        console.error("Create Filiere Error:", error);
        return { error: "Erreur lors de la création de la filière" };
    }
}

export async function updateFiliere({ id, name, description, referentielId }: { id: string, name: string, description?: string, referentielId?: string }) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Non autorisé" };

    try {
        await db.filiere.update({
            where: {
                id,
                tenantId: session.user.tenantId // Security: Scope to tenant
            },
            data: { name, description, referentielId }
        });

        await logAuditEvent("UPDATE_FILIERE", "Filiere", id, { name });

        revalidatePath("/admin/filieres");
        return { success: true };
    } catch (error) {
        return { error: "Erreur lors de la modification" };
    }
}

export async function deleteFiliere(id: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Non autorisé" };

    try {
        await db.filiere.delete({
            where: {
                id,
                tenantId: session.user.tenantId // Security: Scope to tenant
            }
        });

        await logAuditEvent("DELETE_FILIERE", "Filiere", id);

        revalidatePath("/admin/filieres");
        return { success: true };
    } catch (error) {
        return { error: "Erreur lors de la suppression" };
    }
}
