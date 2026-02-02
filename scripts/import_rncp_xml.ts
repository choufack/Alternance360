
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { createReadStream } from 'fs'
import { createInterface } from 'readline'

const prisma = new PrismaClient()

// Regex patterns to capture XML tags content
const REGEX = {
    FICHE_START: /<FICHE>/,
    FICHE_END: /<\/FICHE>/,
    RNCP: /<NUMERO_FICHE>(.*?)<\/NUMERO_FICHE>/,
    TITLE: /<INTITULE>(.*?)<\/INTITULE>/,
    BLOC_START: /<BLOC_COMPETENCES>/,
    BLOC_END: /<\/BLOC_COMPETENCES>/,
    BLOC_CODE: /<CODE>(.*?)<\/CODE>/,
    BLOC_LIBELLE: /<LIBELLE>(.*?)<\/LIBELLE>/,
    COMPETENCE_LIST: /<LISTE_COMPETENCES>(.*?)<\/LISTE_COMPETENCES>/,
    INDICATEUR_ITEM: /[-(•\)]\s*(.*?)(?=(?:[-(•\)]|$))/g // Simple bullet/hyphen parser
}

// Helper to decode XML entities
function decodeXML(str: string): string {
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .trim()
}

async function processLineByLine(filePath: string) {
    const fileStream = createReadStream(filePath)
    const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity
    })

    let currentFiche: any = null
    let currentBloc: any = null
    let inFiche = false
    let inBloc = false
    // Buffer for multi-line tags if needed, but here we assume relatively standard formatting
    // For safer parsing, we might accumulate lines between tags.
    // Given the file size and structure, we'll accumulate content within a FICHE tag.

    let ficheBuffer = ''

    console.log("Starting import...")
    let count = 0

    for await (const line of rl) {
        if (line.includes('<FICHE>')) {
            inFiche = true
            ficheBuffer = '<FICHE>'
            continue
        }

        if (inFiche) {
            ficheBuffer += '\n' + line
            if (line.includes('</FICHE>')) {
                inFiche = false
                await processFiche(ficheBuffer)
                ficheBuffer = ''
                count++
                if (count % 100 === 0) console.log(`Processed ${count} fiches...`)
                // For dev safety/speed, maybe limit to 50 for testing?
                // if (count > 50) break;
            }
        }
    }
}

async function processFiche(xmlContent: string) {
    const rncpMatch = xmlContent.match(REGEX.RNCP)
    const titleMatch = xmlContent.match(REGEX.TITLE)

    if (!rncpMatch || !titleMatch) return

    const codeRncp = decodeXML(rncpMatch[1])
    const title = decodeXML(titleMatch[1])

    // Find existing Global Referentiel or Create
    let ref = await prisma.referentiel.findFirst({
        where: { codeRncp, tenantId: null }
    })

    if (!ref) {
        ref = await prisma.referentiel.create({
            data: {
                codeRncp,
                title,
                isGlobal: true,
                isMarketplacePack: true,
                tenantId: null // Global
            }
        })
    } else {
        // Update title and mark as marketplace pack
        await prisma.referentiel.update({
            where: { id: ref.id },
            data: { title, isMarketplacePack: true }
        })
    }

    // Parse Blocs
    // We can use a simple regex loop for BLOC_COMPETENCES since they are nested
    // Alternatively, use a proper XML parser for the buffer content.
    // Given the implementation plan mentioned script, let's use a simpler regex based split.

    const blocsParts = xmlContent.split('<BLOC_COMPETENCES>')
    // First part is header, subsequent are blocs
    for (let i = 1; i < blocsParts.length; i++) {
        const blocPart = blocsParts[i].split('</BLOC_COMPETENCES>')[0]

        const blocCodeMatch = blocPart.match(REGEX.BLOC_CODE)
        const blocLibelleMatch = blocPart.match(REGEX.BLOC_LIBELLE)
        const competencesMatch = blocPart.match(REGEX.COMPETENCE_LIST)

        if (blocLibelleMatch) {
            const blocTitle = decodeXML(blocLibelleMatch[1])

            // Upsert Bloc
            let bloc = await prisma.blocCompetence.findFirst({
                where: { referentielId: ref.id, title: blocTitle }
            })

            if (!bloc) {
                bloc = await prisma.blocCompetence.create({
                    data: {
                        referentielId: ref.id,
                        title: blocTitle,
                        tenantId: null
                    }
                })
            }

            // Process Competences
            if (competencesMatch) {
                const rawComps = decodeXML(competencesMatch[1])
                // Split by logical separators (hyphens, newlines)
                // Heuristic: usually separated by '- ' or newlines
                const lines = rawComps.split(/[\n\r]+/).map(s => s.trim()).filter(s => s.length > 0)

                for (const line of lines) {
                    // Check if line starts with dash
                    let cleanLine = line.replace(/^-\s*/, '').trim()
                    if (!cleanLine) continue

                    // Upsert Competence
                    let comp = await prisma.competence.findFirst({
                        where: { blocId: bloc.id, description: cleanLine }
                    })

                    if (!comp) {
                        comp = await prisma.competence.create({
                            data: {
                                blocId: bloc.id,
                                description: cleanLine,
                                tenantId: null
                            }
                        })
                    }

                    // Attempt to parse Sub-criteria (items)
                    // If the competence line itself contains parens with lists
                    // Example: "Utiliser ... (eloquence, prise de parole, ...)"
                    const parenMatch = cleanLine.match(/\((.*?)\)/)
                    if (parenMatch) {
                        const itemsContent = parenMatch[1]
                        const items = itemsContent.split(/,|;/).map(s => s.trim()).filter(s => s.length > 0)

                        if (items.length > 1) { // Only if look like a list
                            // We treat the main line as the Competence.
                            // But usually, Competence -> Indicateur -> Item.
                            // In this simple model: Competence -> Indicateur (1:1) -> Items.

                            // Check/Create default Indicateur for this competence
                            let indicateur = await prisma.indicateur.findFirst({
                                where: { competenceId: comp.id } // Default one
                            })

                            if (!indicateur) {
                                indicateur = await prisma.indicateur.create({
                                    data: {
                                        competenceId: comp.id,
                                        description: "Critères d'évaluation"
                                    }
                                })
                            }

                            // Add Items
                            for (const [idx, itemLabel] of items.entries()) {
                                // Check if exists
                                const existingItem = await prisma.evaluationItem.findFirst({
                                    where: { indicateurId: indicateur.id, label: itemLabel }
                                })
                                if (!existingItem) {
                                    await prisma.evaluationItem.create({
                                        data: {
                                            indicateurId: indicateur.id,
                                            label: itemLabel,
                                            orderIndex: idx
                                        }
                                    })
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// Run
const filePath = path.join(process.cwd(), 'export_fiches_RNCP_V4_1_2026-01-26.xml')
if (fs.existsSync(filePath)) {
    processLineByLine(filePath)
        .then(() => console.log('Done'))
        .catch(e => console.error(e))
} else {
    console.error(`File not found: ${filePath}`)
}

