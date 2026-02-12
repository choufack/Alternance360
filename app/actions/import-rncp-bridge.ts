'use server'

import { fetchRNCPBasicInfo } from "@/lib/rncp-api";
import db from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { generateText, getAIStatus } from "@/lib/ai";
import { redirect } from "next/navigation";
import { logAuditEvent } from "./audit";

// 1. Step 1: Fetch API
export async function fetchRNCPAction(rncpCode: string) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Non connecté" };

  return await fetchRNCPBasicInfo(rncpCode);
}

export async function getAIStatusAction() {
  const session = await auth();
  if (!session?.user) return { success: false, configured: false };
  return await getAIStatus();
}

// 2. Step 2: Enrich with AI (The Bridge Script)
export async function enrichRNCPAction(apiData: any) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Non connecté" };

  // Ensure raw_blocks is parsed if it's a string to avoid double-encoding
  let blocksData = apiData.raw_blocks;
  if (typeof blocksData === 'string') {
    try {
      blocksData = JSON.parse(blocksData);
    } catch (e) {
      console.warn("Failed to parse blocksData, using as string");
    }
  }

  const prompt = `
    En tant qu'expert en ingénierie pédagogique pour l'apprentissage, transforme ces données brutes de France Compétences en un référentiel de compétences structuré et professionnel.
    
    IMPORTANT : Tu dois être EXHAUSTIF. Tu ne dois ignorer AUCUN bloc de compétences présent dans les données brutes. 
    Si les données sont volumineuses, traite chaque partie avec la même attention.

    DONNÉES BRUTES :
    Titre : ${apiData.title}
    Code : ${apiData.id_national}
    Niveau : ${apiData.level}
    Données détaillées : ${JSON.stringify(blocksData).slice(0, 100000)} 

    CONSIGNES DE RÉDACTION :
    1. Identifie CHAQUE "Bloc de compétences".
    2. Pour chaque bloc, extrait TOUTES les "Compétences" (parfois notées UPC, Unités, ou simplement listées dans une description). 
       - Si une compétence est présentée sous forme de paragraphe, décompose-la en points clés distincts.
    3. POUR CHAQUE COMPÉTENCE : Génère exactement 3 "Indicateurs de Performance Observables".
       - Un indicateur doit commencer par un verbe d'action.
       - Il doit décrire une situation concrète observable par le tuteur en entreprise.
       - Exemple : "Rédige un compte-rendu technique sans faute d'orthographe après chaque intervention."
    
    FORMAT DE RÉPONSE ATTENDU (JSON STRICT) :
    {
      "code_rncp": "${apiData.id_national}",
      "title": "${apiData.title}",
      "certificationLevel": "${apiData.level}",
      "blocs": [
        {
          "title": "Titre du Bloc",
          "competences": [
            {
              "description": "Description précise de la compétence",
              "indicateurs": [
                { "label": "Indicateur observable 1" },
                { "label": "Indicateur observable 2" },
                { "label": "Indicateur observable 3" }
              ]
            }
          ]
        }
      ]
    }
  `;

  try {
    const text = await generateText(prompt);

    // Nettoyage de la réponse
    const cleanJson = text.replace(/```json|```/g, "").trim();
    const structuredData = JSON.parse(cleanJson);

    // Final check for block count parity if possible
    if (Array.isArray(blocksData) && structuredData.blocs.length < blocksData.length) {
      console.warn(`Potential data loss: API has ${blocksData.length} blocks, AI returned ${structuredData.blocs.length}`);
    }

    await logAuditEvent("ENRICH_RNCP_AI", "Referentiel", apiData.id_national);

    return { success: true, data: structuredData };

  } catch (error: any) {
    console.error("Erreur Bridge AI:", error);
    return { success: false, error: error.message || "Échec de la structuration pédagogique par l'IA." };
  }
}

// 3. Step 3: Save to DB
import { saveReferentielToDb, RNCPSchema, type RNCPData } from "./rncp-utils";

export async function saveRNCPAction(rncpCode: string, title: string, structuredData: any) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Non connecté" };

  const currentUser = await db.user.findUnique({ where: { id: session.user.id } });
  if (!currentUser) return { success: false, error: "Utilisateur inconnu" };

  let targetTenantId: string | undefined;
  let isGlobal = false;

  if (currentUser.role === 'super_admin') {
    isGlobal = true;
  } else if (currentUser.role === 'admin') {
    if (!currentUser.tenantId) return { success: false, error: "Admin sans tenant" };
    targetTenantId = currentUser.tenantId;
  } else {
    return { success: false, error: "Permission refusée" };
  }

  try {
    // Validate with schema first
    const validatedData = RNCPSchema.parse(structuredData);

    await saveReferentielToDb(validatedData, targetTenantId, isGlobal);

    revalidatePath('/admin/import');
    return { success: true, message: `Référentiel ${rncpCode} importé avec succès` };

  } catch (e: any) {
    console.error("Save Error:", e);
    return { success: false, error: "Erreur lors de la sauvegarde en base de données : " + e.message };
  }
}

// 4. Step 4: Clone Global to Local (Marketplace -> Atelier)
export async function cloneReferentielAction(globalRefId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Non connecté" };

  const tenantId = session.user.tenantId;
  if (!tenantId) return { success: false, error: "Vous n'avez pas de tenant associé." };

  try {
    const globalRef = await db.referentiel.findUnique({
      where: { id: globalRefId },
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
    });

    if (!globalRef || !globalRef.isGlobal) {
      return { success: false, error: "Référentiel global introuvable" };
    }

    // Map to RNCPData structure
    const structuredData: RNCPData = {
      code_rncp: globalRef.codeRncp,
      title: globalRef.title,
      certificationLevel: globalRef.certificationLevel || undefined,
      domain: globalRef.domain || undefined,
      blocs: globalRef.blocs.map(bloc => ({
        title: bloc.title,
        competences: bloc.competences.map(comp => ({
          description: comp.description,
          indicateurs: comp.indicateurs.map(ind => ({
            label: ind.description
          }))
        }))
      }))
    };

    // Save as Local for this tenant
    await saveReferentielToDb(structuredData, tenantId, false);

    await logAuditEvent("CLONE_REFERENTIEL", "Referentiel", globalRefId, { tenantId });

    revalidatePath('/admin/marketplace');
    revalidatePath('/admin/referentiels');

    return { success: true, message: "Référentiel ajouté à votre Atelier avec succès !" };

  } catch (error: any) {
    console.error("Clone Error:", error);
    return { success: false, error: "Échec de l'ajout à l'Atelier : " + error.message };
  }
}

