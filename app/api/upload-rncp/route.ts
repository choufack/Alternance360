
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { auth } from '@/auth'
import { z } from 'zod'

// Shared Schemas (Same as before)
const IndicateurSchema = z.object({
    label: z.string().min(1)
})

const CompetenceSchema = z.object({
    description: z.string().min(3),
    code: z.string().optional(),
    indicateurs: z.array(IndicateurSchema).optional()
})

const BlocSchema = z.object({
    title: z.string().min(3),
    competences: z.array(CompetenceSchema)
})

const RNCPSchema = z.object({
    code_rncp: z.string().min(3),
    title: z.string().min(3),
    blocs: z.array(BlocSchema)
})

export async function POST(req: NextRequest) {
    // 1. Check Auth (Session)
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized', error: true }, { status: 401 })
    }

    try {
        const formData = await req.formData()
        const file = formData.get('file') as File
        const tenantId = formData.get('tenant_id') as string | null
        const useAI = formData.get('useAI') === 'on'

        if (!file) {
            return NextResponse.json({ message: 'No file uploaded', error: true }, { status: 400 })
        }

        const text = await file.text()
        let parsedData: z.infer<typeof RNCPSchema>

        // 2. Parse Logic (AI or JSON)
        if (useAI) {
            const promptContext = text.slice(0, 50000)
            const codeMatch = text.match(/RNCP\d+/)
            const rncpCode = codeMatch ? codeMatch[0] : "INCONNU"

            const prompt = `
            En tant qu'expert en ingénierie pédagogique pour l'apprentissage, transforme ces données brutes de France Compétences en un référentiel de compétences structuré et professionnel.
            
            IMPORTANT : Analyse particulièrement les "Unités Pour la Compétence" (UPC) et les "Modalités d'évaluation" pour en extraire des critères de réussite précis.

            FORMAT DE SORTIE (JSON STRICT) :
            {
                "code_rncp": "${rncpCode}",
                "title": "Titre exact de la certification",
                "blocs": [
                    {
                        "title": "Titre du Bloc",
                        "competences": [
                            {
                                "description": "Description de la compétence (ex: UPC 1 - Intitulé)",
                                "indicateurs": [ 
                                    { "label": "Indicateur de performance observable 1" },
                                    { "label": "Indicateur de performance observable 2" },
                                    { "label": "Indicateur de performance observable 3" }
                                ]
                            }
                        ]
                    }
                ]
            }

            DONNÉES BRUTES :
            ${promptContext}
            `

            try {
                // Dynamic import
                const { generateText } = await import('@/lib/ai')
                const aiResponse = await generateText(prompt)
                const cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim()
                parsedData = RNCPSchema.parse(JSON.parse(cleanJson))
            } catch (err: any) {
                console.error("AI Error:", err)
                return NextResponse.json({ message: 'AI Enrichment Failed', error: true, details: err.message }, { status: 500 })
            }

        } else {
            try {
                const json = JSON.parse(text)
                parsedData = RNCPSchema.parse(json)
            } catch (e) {
                return NextResponse.json({ message: "Fichier invalide. Pour les fichiers XML, veuillez cocher l'option 'Nettoyer avec l'IA'.", error: true }, { status: 400 })
            }
        }

        // 3. User & Tenant Check
        const currentUser = await db.user.findUnique({ where: { id: session.user.id } })
        if (!currentUser) {
            return NextResponse.json({ message: 'User not found', error: true }, { status: 404 })
        }

        let targetTenantId: string | undefined
        let isGlobal = false

        if (currentUser.role === 'super_admin') {
            targetTenantId = tenantId || undefined
            isGlobal = !targetTenantId
        } else if (currentUser.role === 'admin') {
            if (!currentUser.tenantId) {
                return NextResponse.json({ message: 'Admin sans tenant', error: true }, { status: 403 })
            }
            targetTenantId = currentUser.tenantId
            isGlobal = false
        } else {
            return NextResponse.json({ message: 'Permission refusée', error: true }, { status: 403 })
        }

        // 4. DB Transaction
        await db.$transaction(async (tx) => {
            // Upsert Referentiel
            const referentiel = await tx.referentiel.upsert({
                where: {
                    id: (await tx.referentiel.findFirst({
                        where: { tenantId: targetTenantId, codeRncp: parsedData.code_rncp }
                    }))?.id || 'new-id'
                },
                update: { title: parsedData.title },
                create: {
                    tenantId: targetTenantId,
                    isGlobal: isGlobal,
                    codeRncp: parsedData.code_rncp,
                    title: parsedData.title
                }
            })

            // Process Blocs
            for (const bloc of parsedData.blocs) {
                const blocDb = await tx.blocCompetence.upsert({
                    where: {
                        id: (await tx.blocCompetence.findFirst({
                            where: { referentielId: referentiel.id, title: bloc.title }
                        }))?.id || 'new-id'
                    },
                    update: {},
                    create: {
                        tenantId: targetTenantId,
                        referentielId: referentiel.id,
                        title: bloc.title
                    }
                })

                // Process Competences
                for (const comp of bloc.competences) {
                    const compDb = await tx.competence.upsert({
                        where: {
                            id: (await tx.competence.findFirst({
                                where: { blocId: blocDb.id, description: comp.description }
                            }))?.id || 'new-id'
                        },
                        update: { description: comp.description },
                        create: {
                            tenantId: targetTenantId,
                            blocId: blocDb.id,
                            description: comp.description
                        }
                    })

                    // Process Indicateurs
                    if (comp.indicateurs && comp.indicateurs.length > 0) {
                        for (const ind of comp.indicateurs) {
                            const existingInd = await tx.indicateur.findFirst({
                                where: { competenceId: compDb.id, description: ind.label }
                            })

                            if (!existingInd) {
                                await tx.indicateur.create({
                                    data: {
                                        competenceId: compDb.id,
                                        description: ind.label
                                    }
                                })
                            }
                        }
                    }
                }
            }
        })

        return NextResponse.json({ message: `Imported ${parsedData.code_rncp} with success`, error: false })

    } catch (error: any) {
        console.error("API Import Error:", error)
        if (error instanceof z.ZodError) {
            return NextResponse.json({ message: 'Validation Error', error: true, details: JSON.stringify(error.issues) }, { status: 400 })
        }
        return NextResponse.json({ message: 'Import failed', error: true, details: error.message }, { status: 500 })
    }
}
