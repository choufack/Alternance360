
import db from '../lib/db';

async function cleanup() {
    console.log('Starting cleanup of inactive titles...');

    const inactiveCodes = ['RNCP1190']; // We can add more here if identified

    for (const code of inactiveCodes) {
        const ref = await db.referentiel.findFirst({
            where: { codeRncp: code, isGlobal: true },
            include: {
                _count: {
                    select: { contracts: true, filieres: true, trainingOffers: true }
                }
            }
        });

        if (ref) {
            const totalUsage = ref._count.contracts + ref._count.filieres + ref._count.trainingOffers;
            if (totalUsage === 0) {
                console.log(`Deleting unused inactive title: ${code} (${ref.title})`);
                await db.referentiel.delete({ where: { id: ref.id } });
            } else {
                console.log(`Title ${code} is inactive but has ${totalUsage} associations. Skipping deletion (needs UI label instead).`);
            }
        } else {
            console.log(`Title ${code} not found in database.`);
        }
    }

    console.log('Cleanup completed.');
}

cleanup()
    .catch(err => console.error(err))
    .finally(() => process.exit());
