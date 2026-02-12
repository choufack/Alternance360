
import db from '@/lib/db'
import { z } from 'zod'
import { logAuditEvent } from './audit'

// --- Standardized Schemas ---

export const IndicateurSchema = z.object({
    label: z.string().min(1)
})

export const CompetenceSchema = z.object({
    description: z.string().min(3),
    indicateurs: z.array(IndicateurSchema).optional()
})

export const BlocSchema = z.object({
    title: z.string().min(3),
    competences: z.array(CompetenceSchema)
})

export const RNCPSchema = z.object({
    code_rncp: z.string().min(3),
    title: z.string().min(3),
    certificationLevel: z.string().optional(),
    domain: z.string().optional(),
    status: z.string().optional(),
    blocs: z.array(BlocSchema)
})

export type RNCPData = z.infer<typeof RNCPSchema>

// --- Centralized Saving Logic ---

export async function saveReferentielToDb(
    data: RNCPData,
    targetTenantId?: string,
    isGlobal: boolean = false
) {
    return await db.$transaction(async (tx) => {
        // 1. Upsert Referentiel
        const existingRef = await tx.referentiel.findFirst({
            where: {
                codeRncp: data.code_rncp,
                tenantId: targetTenantId // Re-checking if I should keep this or use tenant: { id: ... }
            }
        })

        const referentiel = await tx.referentiel.upsert({
            where: { id: existingRef?.id || 'new-id' },
            update: {
                title: data.title,
                certificationLevel: data.certificationLevel,
                domain: data.domain,
                status: (data.status || 'ACTIVE') as any
            },
            create: {
                tenant: targetTenantId ? { connect: { id: targetTenantId } } : undefined,
                isGlobal: isGlobal,
                codeRncp: data.code_rncp,
                title: data.title,
                certificationLevel: data.certificationLevel,
                domain: data.domain,
                status: (data.status || 'ACTIVE') as any
            }
        })

        await logAuditEvent("SAVE_REFERENTIEL", "Referentiel", referentiel.id, { codeRncp: data.code_rncp });

        // 2. Process Blocs
        for (const bloc of data.blocs) {
            const existingBloc = await tx.blocCompetence.findFirst({
                where: { referentielId: referentiel.id, title: bloc.title }
            })

            const blocDb = await tx.blocCompetence.upsert({
                where: { id: existingBloc?.id || 'new-id' },
                update: {},
                create: {
                    tenant: targetTenantId ? { connect: { id: targetTenantId } } : undefined,
                    referentiel: { connect: { id: referentiel.id } },
                    title: bloc.title
                }
            })

            // 3. Process Competences
            for (const comp of bloc.competences) {
                const existingComp = await tx.competence.findFirst({
                    where: { blocId: blocDb.id, description: comp.description }
                })

                const compDb = await tx.competence.upsert({
                    where: { id: existingComp?.id || 'new-id' },
                    update: { description: comp.description },
                    create: {
                        tenant: targetTenantId ? { connect: { id: targetTenantId } } : undefined,
                        bloc: { connect: { id: blocDb.id } },
                        description: comp.description
                    }
                })

                // 4. Process Indicateurs
                if (comp.indicateurs && comp.indicateurs.length > 0) {
                    for (const ind of comp.indicateurs) {
                        const existingInd = await tx.indicateur.findFirst({
                            where: { competenceId: compDb.id, description: ind.label }
                        })

                        if (!existingInd) {
                            await tx.indicateur.create({
                                data: {
                                    competence: { connect: { id: compDb.id } },
                                    description: ind.label
                                }
                            })
                        }
                    }
                }
            }
        }
        return referentiel
    })
}
