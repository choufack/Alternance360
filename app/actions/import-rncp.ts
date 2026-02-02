'use server'

import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { RNCPSchema, saveReferentielToDb } from './rncp-utils'
import db from '@/lib/db'

export type ActionState = {
    message: string
    error?: boolean
    details?: string
}

export async function importRNCP(prevState: ActionState, formData: FormData): Promise<ActionState> {
    const file = formData.get('file') as File
    const tenantId = formData.get('tenant_id') as string

    if (!file) return { message: 'No file uploaded', error: true }

    try {
        const text = await file.text()

        // 1. Process Input with AI if requested
        const useAI = formData.get('useAI') === 'on'
        let parsedData: z.infer<typeof RNCPSchema>

        if (useAI) {
            const promptContext = text.slice(0, 50000)
            const codeMatch = text.match(/RNCP\d+/)
            const rncpCode = codeMatch ? codeMatch[0] : "INCONNU"

            const prompt = `
            Voici les données brutes d'un référentiel (format XML ou JSON).
            Code probable : ${rncpCode}.
            
            Génére une structure propre en Blocs > Compétences > Indicateurs au format JSON.
            Inclus aussi le niveau de certification (ex: "Niveau 5", "BTS") et le domaine d'activité si présents.
            
            Le format de sortie DOIT être une structure JSON valide correspondant strictement à ce schéma :
            {
                "code_rncp": string,
                "title": string,
                "certificationLevel": string (optionnel),
                "domain": string (optionnel),
                "blocs": [
                    {
                        "title": string,
                        "competences": [
                            {
                                "description": string,
                                "indicateurs": [ { "label": string } ] (optionnel)
                            }
                        ]
                    }
                ]
            }

            Données brutes :
            ${promptContext}
            `

            try {
                const { generateText } = await import('@/lib/ai')
                const aiResponse = await generateText(prompt)

                const cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim()
                parsedData = RNCPSchema.parse(JSON.parse(cleanJson))
            } catch (err: any) {
                console.error("AI Error:", err)
                return { message: 'AI Enrichment Failed', error: true, details: err.message }
            }
        } else {
            // Standard JSON Import
            try {
                const json = JSON.parse(text)
                parsedData = RNCPSchema.parse(json)
            } catch (e) {
                return { message: "Fichier invalide. Pour les fichiers XML, veuillez cocher l'option 'Nettoyer avec l'IA'.", error: true }
            }
        }

        // 2. Auth & RBAC Check
        const session = await auth()
        if (!session?.user?.id) throw new Error('Unauthorized')

        const currentUser = await db.user.findUnique({ where: { id: session.user.id } })
        if (!currentUser) throw new Error('User not found')

        let targetTenantId: string | undefined
        let isGlobal = false

        if (currentUser.role === 'super_admin') {
            targetTenantId = tenantId || undefined
            isGlobal = !targetTenantId
        } else if (currentUser.role === 'admin') {
            if (!currentUser.tenantId) throw new Error('Admin sans tenant')
            targetTenantId = currentUser.tenantId
            isGlobal = false
        } else {
            throw new Error('Permission refusée')
        }

        // 3. Perform Import using Shared Utility
        await saveReferentielToDb(parsedData, targetTenantId, isGlobal)

        revalidatePath('/admin/import')
        return { message: `Référentiel ${parsedData.code_rncp} importé avec succès`, error: false }

    } catch (e: any) {
        console.error('Import error:', e)
        if (e instanceof z.ZodError) {
            return { message: 'Validation Error', error: true, details: JSON.stringify(e.issues) }
        }
        return { message: 'Import failed', error: true, details: e.message }
    }
}

