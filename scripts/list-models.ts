import dotenv from "dotenv";

dotenv.config();

async function main() {
    console.log("Listing models...");
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error("No API Key");
        return;
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log("Available Models:");
        (data.models || []).forEach((m: any) => {
            if (m.supportedGenerationMethods?.includes("generateContent")) {
                console.log(`- ${m.name}`);
            }
        });

        if (data.error) {
            console.error("API Error:", data.error);
        }
    } catch (e: any) {
        console.error("Fetch failed:", e.message);
    }
}

main();
