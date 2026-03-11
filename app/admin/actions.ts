'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import db from '@/lib/db'
import { z } from 'zod'
import { syncMilestones } from '../actions/monitoring'
import { generateText } from '@/lib/ai'
import { PERMISSIONS, requirePermission } from '@/lib/permissions'

// --- Users ---

const CreateUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    role: z.enum(['apprentice', 'tutor', 'formateur', 'admin']),
    companyName: z.string().optional(),
    tutorName: z.string().optional(), // For apprentices, name of their tutor if not linked by relation yet
})

export async function createUser(formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Non connecté" }

    // Authorization check
    const currentUser = await db.user.findUnique({ where: { id: session.user.id } })
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin' && currentUser.role !== 'formateur')) {
        return { error: "Permission refusée" }
    }

    const rawData = {
        email: formData.get('email'),
        password: formData.get('password'),
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        role: formData.get('role'),
        companyName: formData.get('companyName'),
        tutorName: formData.get('tutorName')
    }

    const validated = CreateUserSchema.safeParse(rawData)
    if (!validated.success) {
        return { error: "Données invalides", details: validated.error.flatten() }
    }

    const { email, password, firstName, lastName, role, companyName, tutorName } = validated.data

    try {
        // Enforce tenant isolation
        const targetTenantId = session.user.tenantId
        if (!targetTenantId && currentUser.role !== 'super_admin') {
            return { error: "Tenant non identifié pour cet administrateur" }
        }

        // Check if user exists
        const existing = await db.user.findUnique({ where: { email } })
        if (existing) return { error: "Cet email est déjà utilisé" }

        // Hash password
        const { hash } = await import('bcryptjs')
        const hashedPassword = await hash(password, 10)

        // Create User within the same tenant
        await db.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName,
                lastName,
                fullName: `${firstName} ${lastName}`,
                role,
                companyName: companyName || null,
                tutorName: tutorName || null,
                tenantId: targetTenantId
            } as any
        })

        revalidatePath('/admin/users')
        return { success: true, message: "Utilisateur créé avec succès" }
    } catch (e) {
        console.error(e)
        return { error: "Erreur serveur lors de la création de l'utilisateur" }
    }
}

// --- Contracts ---

const CreateContractSchema = z.object({
    userId: z.string().uuid(),
    referentielId: z.string().uuid().optional().or(z.literal('none')),
    startDate: z.string(), // ISO Date
    endDate: z.string(),   // ISO Date
    formateurId: z.string().optional().or(z.literal('none')),
})

export async function createContract(formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Non connecté" }

    const currentUser = await db.user.findUnique({ where: { id: session.user.id } })
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
        // RBAC Fallback
        try {
            requirePermission(session.user, PERMISSIONS.CONTRACT_WRITE)
        } catch {
            return { error: "Permission refusée : Seuls les administrateurs peuvent générer des contrats." }
        }
    }

    const rawData = {
        userId: formData.get('userId'),
        formateurId: formData.get('formateurId'),
        referentielId: formData.get('referentielId'),
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate')
    }

    const validated = CreateContractSchema.safeParse(rawData)
    if (!validated.success) {
        return { error: "Données invalides" }
    }

    const { userId, referentielId, startDate, endDate, formateurId } = validated.data

    try {
        // Verify Referentiel exists AND belongs to the same tenant
        const ref = await db.referentiel.findUnique({ where: { id: referentielId } })
        if (!ref) return { error: "Référentiel introuvable" }

        if (ref.tenantId !== session.user.tenantId && session.user.role !== 'super_admin') {
            return { error: "Accès au référentiel non autorisé" }
        }

        // Verify Apprentice belongs to the same tenant
        const apprentice = await db.user.findUnique({ where: { id: userId } })
        if (!apprentice || (apprentice.tenantId !== session.user.tenantId && session.user.role !== 'super_admin')) {
            return { error: "Apprenti non autorisé" }
        }

        // Handle formateurId logic: if "none" or undefined, it should be null
        const finalFormateurId = (formateurId && formateurId !== 'none') ? formateurId : null;

        if (finalFormateurId) {
            const formateur = await db.user.findUnique({ where: { id: finalFormateurId } })
            if (!formateur || (formateur.tenantId !== session.user.tenantId && session.user.role !== 'super_admin')) {
                return { error: "Formateur non autorisé" }
            }
        }

        const finalReferentielId = (referentielId && referentielId !== 'none') ? referentielId : null;

        const contract = await db.contract.create({
            data: {
                userId,
                referentielId: finalReferentielId,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                tenantId: session.user.tenantId!, // Inherit tenant from the admin session
                formateurId: finalFormateurId
            } as any
        })

        // TRIGGER C: Alert if missing referentiel
        if (!finalReferentielId) {
            // Find Fillere Manager (Admins in this tenant)
            const managers = await db.user.findMany({
                where: { tenantId: session.user.tenantId, role: 'admin' }
            })
            for (const manager of managers) {
                await (db as any).notificationLog.create({
                    data: {
                        recipientId: manager.id,
                        type: 'ALERT',
                        title: 'ACTION REQUISE: Référentiel Manquant',
                        content: `Le contrat de l'apprenti ${apprentice.fullName} a été créé sans référentiel RNCP lié. Veuillez l'assigner pour activer le TSF.`,
                    }
                })
            }
        }

        // Auto-sync mandatory milestones
        await syncMilestones(contract.id)

        // TRIGGER A: Auto-generate Draft TSF
        try {
            await initializeApprenticeJourney(contract.id, 'SEMESTER')
        } catch (err) {
            console.error("Trigger A failed:", err)
        }

        revalidatePath('/admin/contracts')
        return { success: true, message: "Contrat créé avec succès" }
    } catch (e) {
        console.error(e)
        return { error: "Erreur serveur lors de la création du contrat" }
    }
}

export async function deleteUser(userId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Non connecté" }

    const currentUser = await db.user.findUnique({ where: { id: session.user.id } })
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
        return { error: "Permission refusée" }
    }

    try {
        // Verify user belongs to the same tenant before deleting
        const userToDelete = await db.user.findUnique({ where: { id: userId } })
        if (!userToDelete || (userToDelete.tenantId !== session.user.tenantId && session.user.role !== 'super_admin')) {
            try {
                requirePermission(session.user, PERMISSIONS.USER_WRITE)
            } catch {
                return { error: "Utilisateur non trouvé ou accès non autorisé" }
            }
        }

        await db.user.delete({ where: { id: userId } })
        revalidatePath('/admin/users')
        return { success: true }
    } catch (e) {
        return { error: "Impossible de supprimer l'utilisateur" }
    }
}

export async function importGlobalReferentiel(referentielId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Non connecté" }

    // Super admins can fork without tenantId (for preview/testing)
    const targetTenantId = session.user.tenantId || null

    try {

        // 1. Fetch Global Referentiel with deep structure
        const globalRef = await db.referentiel.findFirst({
            where: { id: referentielId, isGlobal: true } as any,
            include: {
                blocs: {
                    include: {
                        competences: {
                            include: {
                                indicateurs: true
                            }
                        }
                    }
                }
            }
        })

        if (!globalRef) return { error: "Référentiel global introuvable" }

        // 2. Check overlap (only if user has a tenant)
        if (targetTenantId) {
            const existing = await db.referentiel.findFirst({
                where: {
                    tenantId: targetTenantId,
                    codeRncp: globalRef.codeRncp
                }
            })
            if (existing) return { error: "Ce référentiel existe déjà dans votre bibliothèque" }
        }

        // 3. Deep Copy Transaction
        await db.$transaction(async (tx) => {
            // Increment download count on source
            await tx.referentiel.update({
                where: { id: referentielId },
                data: { downloadCount: { increment: 1 } } as any
            })

            // New Referentiel
            const newRef = await tx.referentiel.create({
                data: {
                    tenantId: targetTenantId,
                    codeRncp: globalRef.codeRncp,
                    title: globalRef.title,
                    isGlobal: false
                } as any
            })

            // Copy Blocs
            for (const bloc of (globalRef as any).blocs) {
                const newBloc = await tx.blocCompetence.create({
                    data: {
                        tenantId: targetTenantId,
                        referentielId: newRef.id,
                        title: bloc.title,
                        orderIndex: bloc.orderIndex
                    } as any
                })

                // Copy Competences
                for (const comp of bloc.competences) {
                    const newComp = await tx.competence.create({
                        data: {
                            tenantId: targetTenantId,
                            blocId: newBloc.id,
                            description: comp.description
                        } as any
                    })

                    // Copy Indicateurs
                    if (comp.indicateurs.length > 0) {
                        await tx.indicateur.createMany({
                            data: comp.indicateurs.map((ind: any) => ({
                                competenceId: newComp.id,
                                description: ind.description
                            }))
                        })
                    }
                }
            }
        })


        revalidatePath('/admin/referentiels')
        revalidatePath('/admin/marketplace')
        return { success: true }
    } catch (error) {
        console.error("Import Global Error:", error)
        return { error: "Erreur lors de l'importation" }
    }
}

export async function updateReferentielStructure(blocId: string, competences: any[], periodIndex?: number) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Non connecté" }

    try {
        await db.$transaction(async (tx) => {
            // Update Bloc periodIndex if provided
            if (periodIndex !== undefined) {
                await tx.blocCompetence.update({
                    where: { id: blocId },
                    data: { periodIndex } as any
                })
            }

            const existingComps = await tx.competence.findMany({ where: { blocId } })
            // ...
            const compIds = existingComps.map(c => c.id)

            await tx.indicateur.deleteMany({ where: { competenceId: { in: compIds } } })
            await tx.competence.deleteMany({ where: { blocId } })

            for (const comp of competences) {
                const newComp = await tx.competence.create({
                    data: {
                        blocId,
                        description: comp.description,
                        tenantId: session.user.tenantId || null
                    } as any
                })

                if (comp.indicateurs && comp.indicateurs.length > 0) {
                    await tx.indicateur.createMany({
                        data: comp.indicateurs.map((ind: any) => ({
                            competenceId: newComp.id,
                            description: ind.description
                        }))
                    })
                }
            }
        })

        revalidatePath(`/admin/referentiels`)
        return { success: true }
    } catch (error) {
        console.error("Update Structure Error:", error)
        return { error: "Erreur lors de la sauvegarde" }
    }
}

export async function generateCriteriaWithAI(rncpTitle: string, blocTitle: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Non connecté" }

    const prompt = `
        En tant qu'expert en ingénierie de formation pour les CFA en France.
        Contexte : Le référentiel "${rncpTitle}".
        Bloc de compétences : "${blocTitle}".
        
        Objectif : Générer 5 critères d'évaluation concrets et pertinents pour ce bloc.
        Format : Répondre uniquement avec un tableau JSON de chaînes de caractères.
        Exemple : ["Critère 1", "Critère 2", ...]
    `

    try {
        const result = await generateText(prompt)
        const jsonMatch = result.match(/\[[\s\S]*\]/)
        const criteria = JSON.parse(jsonMatch ? jsonMatch[0] : result)
        return { success: true, criteria }
    } catch (error) {
        console.error("AI Generation Error:", error)
        return { error: "Erreur lors de la génération IA" }
    }
}

export async function initializeApprenticeJourney(contractId: string, periodType: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Non connecté" }

    try {
        const contract = await db.contract.findUnique({
            where: { id: contractId },
            include: {
                referentiel: {
                    include: {
                        blocs: {
                            include: {
                                competences: {
                                    include: {
                                        indicateurs: true
                                    }
                                }
                            },
                            orderBy: { orderIndex: 'asc' }
                        }
                    }
                },
                initialAssessments: {
                    include: {
                        positionings: true
                    }
                }
            }
        })

        if (!contract) return { error: "Contrat introuvable" }
        if (!contract.referentiel) return { error: "Référentiel introuvable" }

        // 1. Calculate Periods
        const start = new Date(contract.startDate)
        const end = new Date(contract.endDate)
        const totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())

        let periodMonths = 6 // Semester
        if (periodType === 'TRIMESTER') periodMonths = 3
        if (periodType === 'MONTH') periodMonths = 1

        const numPeriods = Math.max(1, Math.ceil(totalMonths / periodMonths))

        // Handling Versioning
        const c = contract as any;
        const currentVersionNumber = c.versionId ? parseInt(c.versionId.replace('v', '')) : 0;
        const nextVersion = `v${currentVersionNumber + 1}`;
        const versionId = c.isLocked ? nextVersion : `v1`;

        await db.$transaction(async (tx) => {
            // Update contract
            await tx.contract.update({
                where: { id: contractId },
                data: {
                    versionId,
                    periodType,
                    tsfStatus: c.isLocked ? 'VALIDATED' : 'DRAFT', // Keep validated if re-generating a version
                    isLocked: false, // Reset lock for new version if it was locked
                    changeLog: c.isLocked ? `Mise à jour suite à modification post-verrouillage` : null
                } as any
            })

            // 2. Clear existing TSF & Periods
            await tx.tSFMapping.deleteMany({ where: { contractId } })
            await tx.period.deleteMany({ where: { contractId } })

            // 3. Create Period Records with Smart Logic

            // Helper to get end of month
            const getEndOfMonth = (date: Date) => {
                const d = new Date(date)
                d.setMonth(d.getMonth() + 1)
                d.setDate(0)
                d.setHours(23, 59, 59)
                return d
            }

            const createdPeriods = []
            let currentStart = new Date(start)

            for (let i = 0; i < numPeriods; i++) {
                let pEnd = new Date(currentStart)

                // Smart Semester Logic
                if (periodType === 'SEMESTER') {
                    const month = currentStart.getMonth() // 0-11

                    // If starting in Aug/Sept/Oct/Nov/Dec -> End Jan 31
                    if (month >= 7 || month <= 0) {
                        // Target next January
                        if (month <= 0) {
                            pEnd.setMonth(0) // Jan
                            pEnd.setDate(31)
                        } else {
                            pEnd.setFullYear(pEnd.getFullYear() + 1)
                            pEnd.setMonth(0) // Jan (next year)
                            pEnd.setDate(31)
                        }
                    }
                    // If starting in Feb-Jun -> End Aug 31
                    else {
                        pEnd.setMonth(7) // Aug
                        pEnd.setDate(31)
                    }
                } else {
                    // Standard Logic for Trimester/Month
                    pEnd.setMonth(currentStart.getMonth() + periodMonths)
                    pEnd = getEndOfMonth(pEnd)
                }

                // Cap at contract end
                if (pEnd > end) pEnd.setTime(end.getTime())

                // Safety: if start >= end, force at least 1 day or skip
                if (currentStart >= pEnd) {
                    pEnd = new Date(currentStart)
                    pEnd.setDate(pEnd.getDate() + 30)
                }

                const period = await tx.period.create({
                    data: {
                        contractId,
                        label: `${periodType === 'SEMESTER' ? 'Semestre' : periodType === 'TRIMESTER' ? 'Trimestre' : 'Mois'} ${i + 1}`,
                        orderIndex: i,
                        startDate: currentStart,
                        endDate: pEnd
                    }
                })
                createdPeriods.push(period)

                // Next start is day after current end
                currentStart = new Date(pEnd)
                currentStart.setDate(currentStart.getDate() + 1)
            }

            // 4. Distribute Blocs & Competences
            const blocs = contract.referentiel!.blocs
            const blocCounts = new Array(numPeriods).fill(0)

            for (let i = 0; i < blocs.length; i++) {
                const bloc = blocs[i]

                // Logic: Use periodIndex if specified (>0), otherwise distribute while respecting max 3 per period if possible
                let targetPeriodIdx = (bloc as any).periodIndex

                // If periodIndex is 0 (default) or invalid, we distribute
                if (!targetPeriodIdx || targetPeriodIdx > numPeriods) {
                    targetPeriodIdx = Math.floor(i * numPeriods / blocs.length) + 1
                }

                // Adjust to 0-based
                let finalIdx = Math.min(targetPeriodIdx - 1, numPeriods - 1)

                // Optional: strictly limit to 3? 
                // For now, let's keep it flexible but lean towards the requested 1-3.

                const assignedPeriod = createdPeriods[finalIdx]

                for (const comp of bloc.competences) {
                    // Check initial assessment
                    const positioning = contract.initialAssessments[0]?.positionings.find(p => p.competenceId === comp.id)
                    const isAcquis = positioning && (positioning.levelInitial >= 3)

                    await tx.tSFMapping.create({
                        data: {
                            contractId,
                            competenceId: comp.id,
                            periodId: assignedPeriod.id,
                            lieu: 'MIXTE',
                            status: isAcquis ? 'ACQUIS' : 'PENDING',
                            versionId,
                            competenceDescription: comp.description,
                            blocTitle: bloc.title
                        } as any
                    })
                }
            }
        })

        revalidatePath(`/admin/users/${contract.userId}`)
        return { success: true, numPeriods, versionId }
    } catch (e) {
        console.error("Initialization Error:", e)
        return { error: "Erreur lors de la génération du parcours" }
    }
}

export async function lockContractTSF(contractId: string, signature: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Non connecté" }

    try {
        await db.contract.update({
            where: { id: contractId },
            data: {
                isLocked: true,
                lockedAt: new Date(),
                tutorSignature: signature,
                signedAt: new Date(),
                tsfStatus: 'VALIDATED'
            } as any
        })

        revalidatePath(`/admin/users`)
        return { success: true }
    } catch (e) {
        return { error: "Erreur lors du verrouillage" }
    }
}


// --- Tenant Settings ---

const UpdateTenantSchema = z.object({
    name: z.string().min(1),
    primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    siret: z.string().optional(),
    address: z.string().optional(),
    contactEmail: z.string().email().optional().or(z.literal('')),
    contactPhone: z.string().optional(),
    website: z.string().url().optional().or(z.literal('')),
})

export async function updateTenant(formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Non connecté" }

    const currentUser = await db.user.findUnique({ where: { id: session.user.id } })
    if (!currentUser || currentUser.role !== 'admin') {
        return { error: "Permission refusée" }
    }

    const tenantId = currentUser.tenantId
    if (!tenantId) return { error: "Aucun organisme lié" }

    const rawData = {
        name: formData.get('name'),
        primaryColor: formData.get('primaryColor'),
        siret: formData.get('siret'),
        address: formData.get('address'),
        contactEmail: formData.get('contactEmail'),
        contactPhone: formData.get('contactPhone'),
        website: formData.get('website'),
    }

    const validated = UpdateTenantSchema.safeParse(rawData)
    if (!validated.success) {
        return { error: "Données invalides", details: validated.error.flatten() }
    }

    try {
        await db.tenant.update({
            where: { id: tenantId },
            data: validated.data as any
        })

        revalidatePath('/admin/settings')
        return { success: true, message: "Paramètres mis à jour" }
    } catch (e) {
        console.error(e)
        return { error: "Erreur lors de la mise à jour" }
    }
}

export async function chatWithAI(messages: { role: string, content: string }[], context: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Non connecté" }

    const lastMessage = messages[messages.length - 1];
    const history = messages.slice(0, -1).map(m => `${m.role === 'user' ? 'Utilisateur' : 'Expert Pédagogique'}: ${m.content}`).join('\n');

    const prompt = `
        Tu es un expert en ingénierie pédagogique pour l'apprentissage et la formation professionnelle.
        Ton rôle est d'aider un formateur ou un administrateur à concevoir des référentiels de compétences (RNCP).

        CONTEXTE ACTUEL :
        ${context}

        HISTORIQUE :
        ${history}

        Dernière demande de l'utilisateur : "${lastMessage.content}"

        Réponds de manière concise, structurée et directement exploitable. Propose des reformulations, des critères ou des conseils pédagogiques précis.
    `;

    try {
        const response = await generateText(prompt);
        return { success: true, response };

    } catch (error) {
        console.error("Chat AI Error:", error);
        return { error: "Erreur lors de la communication avec l'IA." };
    }
}

export async function refineCompetence(currentDescription: string, currentIndicators: string[], userPrompt: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Non connecté" }

    const prompt = `
        Tu es un expert pédagogique.
        CONTEXTE :
        Compétence actuelle : "${currentDescription}"
        Indicateurs actuels : ${JSON.stringify(currentIndicators)}

        DEMANDE UTILISATEUR : "${userPrompt}"

        TÂCHE : Réécris la compétence et/ou les indicateurs pour répondre à la demande.
        
        FORMAT DE RÉPONSE ATTENDU (JSON) :
        {
            "description": "Nouvelle description",
            "indicateurs": ["Indicateur 1", "Indicateur 2", ...]
        }
        Réponds UNIQUEMENT avec le JSON valide.
    `;

    try {
        const result = await generateText(prompt);
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Format JSON non trouvé");

        const data = JSON.parse(jsonMatch[0]);
        return { success: true, data };
    } catch (error) {
        console.error("Refine Competence Error:", error);
        return { error: "Erreur lors de l'adaptation par l'IA." };
    }
}

export async function generateCompetenceFromDescription(userDescription: string) {
    console.log("SERVER ACTION: generateCompetenceFromDescription", userDescription);
    const session = await auth()
    if (!session?.user?.id) {
        console.error("SERVER: User not connected");
        return { error: "Non connecté" }
    }

    const prompt = `
        Tu es un expert pédagogique.
        TÂCHE : Créer une compétence complète à partir de cette description courte : "${userDescription}".
        
        FORMAT DE RÉPONSE ATTENDU (JSON) :
        {
            "description": "Description formelle et pédagogique de la compétence",
            "indicateurs": ["Indicateur de performance 1", "Indicateur 2", "Indicateur 3"]
        }
        Réponds UNIQUEMENT avec le JSON valide.
    `;

    try {
        console.log("SERVER: Calling Google AI...");
        const result = await generateText(prompt);
        console.log("SERVER: AI Result:", result);

        // Check if result is an error message
        if (result.startsWith("Erreur")) {
            return { error: result };
        }

        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("Invalid JSON from AI:", result);
            return { error: "L'IA a renvoyé un format inattendu. Veuillez réessayer." };
        }

        const data = JSON.parse(jsonMatch[0]);
        return { success: true, data };
    } catch (error) {
        console.error("Generate Competence Error:", error);
        return { error: "Erreur lors de la génération par l'IA." };
    }
}

