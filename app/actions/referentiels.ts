"use server";

import db from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { logAuditEvent } from "./audit";

export async function deleteReferentiel(id: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Non autorisé" };

    try {
        // Cascade delete in a transaction: indicateurs → competences → blocs → referentiel
        await db.$transaction(async (tx) => {
            // 1. Delete all indicateurs for all competences in all blocs
            const blocs = await tx.blocCompetence.findMany({
                where: { referentielId: id },
                select: { id: true }
            });
            const blocIds = blocs.map(b => b.id);

            const comps = await tx.competence.findMany({
                where: { blocId: { in: blocIds } },
                select: { id: true }
            });
            const compIds = comps.map(c => c.id);

            await tx.indicateur.deleteMany({ where: { competenceId: { in: compIds } } });
            await tx.competence.deleteMany({ where: { blocId: { in: blocIds } } });
            await tx.blocCompetence.deleteMany({ where: { referentielId: id } });
            await tx.referentiel.delete({ where: { id } });
        });

        await logAuditEvent("DELETE_REFERENTIEL", "Referentiel", id);

        revalidatePath("/admin/referentiels");
        return { success: true };
    } catch (error) {
        console.error("Delete Referentiel Error:", error);
        return { error: "Erreur lors de la suppression du référentiel" };
    }
}
