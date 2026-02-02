import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
    console.warn("GOOGLE_API_KEY is not defined in the environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

export async function generateText(prompt: string): Promise<string> {
    if (!apiKey) {
        // Fail silently or return empty if not configured, to avoid breaking UI
        console.warn("GOOGLE_API_KEY missing, returning empty string");
        return "";
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
        return "Erreur lors de la génération IA.";
    }
}

export async function getAIStatus() {
    return {
        configured: !!apiKey,
        model: "gemini-flash-latest"
    };
}
