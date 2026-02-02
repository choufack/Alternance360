"use server";

import { generateText } from "@/lib/ai";

export async function askAI(prompt: string) {
    try {
        const response = await generateText(prompt);
        return { success: true, data: response };
    } catch (error) {
        console.error("AI Action Error:", error);
        return { success: false, error: "Failed to process AI request." };
    }
}
