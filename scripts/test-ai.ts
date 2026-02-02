// import { generateText } from "../lib/ai";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    console.log("Testing AI Connection...");
    try {
        if (!process.env.GOOGLE_API_KEY) {
            console.error("❌ ERROR: GOOGLE_API_KEY is missing from .env");
            process.exit(1);
        }
        console.log("Key found:", process.env.GOOGLE_API_KEY.slice(0, 5) + "...");

        const { generateText } = await import("../lib/ai");
        const response = await generateText("Hello! Are you working? Reply with 'Yes, I am working!' in French.");
        console.log("\n✅ AI Response:");
        console.log(response);
    } catch (error: any) {
        console.error("\n❌ AI Connection Failed:");
        console.error(error.message);
    }
}

main();
