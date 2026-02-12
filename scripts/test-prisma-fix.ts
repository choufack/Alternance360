
import { saveReferentielToDb } from './app/actions/rncp-utils';
import db from './lib/db';

async function testFix() {
    const data = {
        code_rncp: "TEST_RNCP_CLONE",
        title: "Test Vêtement de peau",
        certificationLevel: "Niveau 3",
        blocs: []
    };
    const tenantId = "f46cb651-cc6a-40b5-957d-a46ee8c5c9e1";

    console.log('Testing saveReferentielToDb with tenantId...');
    try {
        const result = await saveReferentielToDb(data as any, tenantId, false);
        console.log('Success!', result.id);

        // Cleanup
        await db.referentiel.delete({ where: { id: result.id } });
    } catch (err) {
        console.error('STILL FAILING:', err);
    }
}

testFix().finally(() => process.exit());
