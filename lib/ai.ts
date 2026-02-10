import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
    console.warn("GOOGLE_API_KEY is not defined in the environment variables.");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-flash-latest" }) : null;

export async function generateText(prompt: string): Promise<string> {
    if (!apiKey) {
        console.warn("GOOGLE_API_KEY missing");
        return "Erreur Configuration: Clé API manquante";
    }

    if (!model) {
        console.warn("AI Model not initialized");
        return "Erreur Configuration: Modèle IA non initialisé";
    }

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error: any) {
        if (error.status === 429 || error.message?.includes('429')) {
            console.warn("AI Rate Limit Exceeded (429). returning fallback.");
            return "Analyse IA indisponible (Quota atteint).";
        }
        console.error("Error generating text with AI:", error);

        // Handle specific "API Key not found" error from Google
        if (error.message?.includes('API Key not found')) {
            return "Erreur Configuration: Clé API invalide";
        }

        return "Erreur lors de la génération IA.";
    }
}

export async function getAIStatus() {
    return {
        configured: !!apiKey,
        model: "gemini-flash-latest"
    };
}
