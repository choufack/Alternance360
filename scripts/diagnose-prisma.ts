
import { PrismaClient } from '@prisma/client';

async function diagnose() {
    const db = new PrismaClient();
    console.log('--- Prisma Model Diagnosis (v2) ---');
    try {
        const tableInfo: any[] = await db.$queryRawUnsafe(`PRAGMA table_info(Referentiel)`);
        console.log('Columns found in Referentiel:');
        tableInfo.forEach(col => {
            console.log(` - ${col.name} (${col.type})`);
        });

        const hasStatus = tableInfo.some(col => col.name === 'status');
        console.log('\nDatabase has "status" column:', hasStatus);

    } catch (err: any) {
        console.error('DIAGNOSIS FAILED:', err.message);
    } finally {
        await db.$disconnect();
    }
}

diagnose().finally(() => process.exit());
