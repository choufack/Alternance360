'use server'

import { auth } from "@/auth"
import db from "@/lib/db"
import { uploadFile } from "@/lib/upload"
import { revalidatePath } from "next/cache"
import { logAuditEvent } from "./audit"

export async function createJournalEntry(data: any, formData?: FormData) {
    const session = await auth()
    if (!session || !session.user || !session.user.id) {
        return { error: "Non authentifié" }
    }

    let fileUrl = ""
    let fileType = "TEXT" // Default if no file

    if (formData) {
        const file = formData.get('file') as File
        if (file && file.size > 0) {
            try {
                // Upload to 'journal' folder for better organization
                fileUrl = await uploadFile(file, 'journal')
                fileType = file.type === 'application/pdf' ? 'PDF' : 'IMG'
            } catch (e) {
                console.error("Upload error:", e)
                return { error: "Erreur lors de l'upload du fichier" }
            }
        }
    }

    // Attempt to link primary competence if available
    let primaryCompetenceId = null
    if (data.competences && Array.isArray(data.competences) && data.competences.length > 0) {
        primaryCompetenceId = data.competences[0]
    }

    // Store rich data in description as JSON
    const descriptionJson = JSON.stringify({
        description: data.description, // 'titre' is stored in proof.title, but we keep raw fields here too
        reflexion_appris: data.reflexion_appris,
        reflexion_difficultes: data.reflexion_difficultes,
        outils: data.outils,
        competences: data.competences,
        date: data.date
    })

    try {
        const proof = await db.proof.create({
            data: {
                userId: session.user.id,
                title: data.titre,
                description: descriptionJson,
                url: fileUrl,
                type: fileType,
                status: 'PENDING',
                competenceId: primaryCompetenceId // Link for relational queries
            }
        })

        await logAuditEvent("CREATE_JOURNAL_ENTRY", "Proof", proof.id, { title: data.titre });
    } catch (e) {
        console.error("Insert error:", e)
        return { error: "Erreur lors de la sauvegarde en base de données" }
    }

    revalidatePath('/dashboard')
    revalidatePath('/pedagogie/journal')
    return { success: true }
}
