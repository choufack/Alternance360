'use server'

import { fetchRNCPBasicInfo } from "@/lib/rncp-api";
import db from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { generateText, getAIStatus } from "@/lib/ai";

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

  const prompt = `
    En tant qu'expert en ingénierie pédagogique pour l'apprentissage, transforme ces données brutes de France Compétences en un référentiel de compétences structuré et professionnel.
    
    IMPORTANT : Analyse particulièrement les "Unités Pour la Compétence" (UPC) et les "Modalités d'évaluation" présentes dans les données brutes pour en extraire des critères de réussite précis.

    DONNÉES BRUTES :
    Titre : ${apiData.title}
    Code : ${apiData.id_national}
    Niveau : ${apiData.level}
    Données détaillées : ${JSON.stringify(apiData.raw_blocks).slice(0, 60000)} 

    CONSIGNES DE RÉDACTION :
    1. Identifie chaque "Bloc de compétences".
    2. Pour chaque bloc, extrait les "Compétences" (parfois notées UPC).
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
              "description": "Description de la compétence (ex: UPC 1 - Intitulé)",
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

    return { success: true, data: structuredData };

  } catch (error: any) {
    console.error("Erreur Bridge AI:", error);
    return { success: false, error: error.message || "Échec de la structuration pédagogique par l'IA." };
  }
}

// 3. Step 3: Save to DB
import { saveReferentielToDb, RNCPSchema } from "./rncp-utils";

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

