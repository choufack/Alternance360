
import db from '@/lib/db';

async function verifyTSF(email: string) {
    console.log(`Checking TSF for user with email: ${email}`);

    const user = await db.user.findUnique({
        where: { email },
        include: {
            contracts: {
                include: {
                    periodes: true,
                    tsfMapping: true,
                    referentiel: true
                }
            }
        }
    });

    if (!user) {
        console.error("❌ User not found!");
        return;
    }

    console.log(`✅ User found: ${user.fullName} (${user.id})`);
    console.log(`   Promotion ID: ${user.promotionId || "None"}`);

    if (user.contracts.length === 0) {
        console.error("❌ No contracts found for this user.");
        return;
    }

    const contract = user.contracts[0];
    console.log(`✅ Contract found: ${contract.id}`);
    console.log(`   Start Date: ${contract.startDate}`);
    console.log(`   Referentiel ID: ${contract.referentielId}`);

    if (contract.periodes.length === 0) {
        console.error("❌ No periods generated (Periods table empty for this contract).");
    } else {
        console.log(`✅ Periods generated: ${contract.periodes.length}`);
        contract.periodes.forEach(p => console.log(`   - ${p.label} (${p.startDate.toISOString().split('T')[0]} - ${p.endDate.toISOString().split('T')[0]})`));
    }

    if (contract.tsfMapping.length === 0) {
        console.error("❌ No TSF Mappings generated (TSFMapping table empty for this contract).");
    } else {
        console.log(`✅ TSF Mappings generated: ${contract.tsfMapping.length} items`);
    }

    if (contract.periodes.length > 0 && contract.tsfMapping.length > 0) {
        console.log("\n✨ CONCLUSION: TSF generation appears SUCCESSFUL.");
    } else {
        console.log("\n⚠️ CONCLUSION: TSF generation appears INCOMPLETE.");
    }
}

// Get email from command line arg
const email = process.argv[2];
if (!email) {
    console.log("Usage: npx tsx scripts/verify_tsf_generation.ts <email>");
} else {
    verifyTSF(email).catch(console.error);
}
