"use server";

import fs from "fs";
import path from "path";

export async function updateEnvApiKey(apiKey: string) {
    try {
        const envPath = path.resolve(process.cwd(), ".env");

        // Check if .env exists, if not create it
        if (!fs.existsSync(envPath)) {
            fs.writeFileSync(envPath, `GOOGLE_API_KEY="${apiKey}"\n`);
            return { success: true, message: "Fichier .env créé et clé ajoutée." };
        }

        let envContent = fs.readFileSync(envPath, "utf-8");
        const keyRegex = /^GOOGLE_API_KEY=.*$/m;

        if (keyRegex.test(envContent)) {
            // Replace existing key
            envContent = envContent.replace(keyRegex, `GOOGLE_API_KEY="${apiKey}"`);
        } else {
            // Append new key
            envContent += `\nGOOGLE_API_KEY="${apiKey}"\n`;
        }

        fs.writeFileSync(envPath, envContent);
        return { success: true, message: "Clé API mise à jour avec succès." };
    } catch (error) {
        console.error("Failed to update .env file:", error);
        return { success: false, message: "Erreur lors de la mise à jour du fichier .env." };
    }
}
