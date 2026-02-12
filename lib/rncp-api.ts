
export async function fetchRNCPBasicInfo(rncpCode: string) {
    const baseUrl = "https://data.apprentissage.beta.gouv.fr/api/explore/v2.1/catalog/datasets/fiches-rncp/records";
    // Construct query to filter by numero_fiche exact match
    const query = `where=numero_fiche="${rncpCode}"&limit=1`;
    const url = `${baseUrl}?${query}`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`Opendatasoft API Error: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.results || data.results.length === 0) {
            return { success: false, error: "Fiche RNCP introuvable" };
        }

        const record = data.results[0];

        // Return relevant fields
        return {
            success: true,
            data: {
                id_national: record.numero_fiche,
                title: record.intitule,
                active: record.etat_fiche === "Active",
                level: record.niveau_qualification,
                raw_blocks: record.blocs_competences
            }
        };

    } catch (error: any) {
        console.error("Fetch RNCP Error:", error);
        return { success: false, error: error.message || "Erreur lors de la récupération de la fiche" };
    }
}
