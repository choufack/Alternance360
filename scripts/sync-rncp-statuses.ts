
import fs from 'fs';
import path from 'path';
import db from '../lib/db';

async function syncRncpStatuses() {
    console.log('Starting Mass RNCP Status Synchronization...');

    const csvPath = path.join(__dirname, 'export_fiches_CSV_Standard_2026_02_10.csv');
    if (!fs.existsSync(csvPath)) {
        console.error('CSV file not found at:', csvPath);
        return;
    }

    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n');
    const statusMap = new Map<string, string>();

    console.log(`Processing ${lines.length} lines from CSV...`);

    // Skip header and process lines
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // The CSV uses semi-colon delimiter and quotes
        // Format: "Id_Fiche";"Numero_Fiche";...;"Actif"
        const parts = line.split(';');
        if (parts.length < 16) continue;

        const codeRncp = parts[1].replace(/"/g, '');
        let status = parts[15].replace(/"/g, '');

        if (status === 'ACTIVE' || status === 'INACTIVE') {
            statusMap.set(codeRncp, status);
        }
    }

    console.log(`Mapped ${statusMap.size} RNCP codes to statuses.`);

    const globalRefs = await db.referentiel.findMany({
        where: { isGlobal: true },
        include: {
            _count: {
                select: { contracts: true, filieres: true, trainingOffers: true }
            }
        }
    });

    console.log(`Found ${globalRefs.length} global referentiels in DB.`);

    let updatedCount = 0;
    let deletedCount = 0;
    let keptInactiveCount = 0;

    for (const ref of globalRefs) {
        const officialStatus = statusMap.get(ref.codeRncp);

        if (officialStatus) {
            // Update status if it changed
            if (ref.status !== officialStatus) {
                await db.referentiel.update({
                    where: { id: ref.id },
                    data: { status: officialStatus }
                });
                updatedCount++;
            }

            // If inactive and unused, delete
            if (officialStatus === 'INACTIVE') {
                const totalUsage = ref._count.contracts + ref._count.filieres + ref._count.trainingOffers;
                if (totalUsage === 0) {
                    await db.referentiel.delete({ where: { id: ref.id } });
                    deletedCount++;
                } else {
                    keptInactiveCount++;
                }
            }
        } else {
            // console.log(`Warning: Code ${ref.codeRncp} not found in official registry.`);
        }
    }

    console.log('--- Sync Report ---');
    console.log(`Updated Statuses: ${updatedCount}`);
    console.log(`Deleted (Inactive & Unused): ${deletedCount}`);
    console.log(`Kept (Inactive but Used): ${keptInactiveCount}`);
    console.log('Synchronization completed successfully.');
}

syncRncpStatuses()
    .catch(err => console.error(err))
    .finally(() => process.exit());
