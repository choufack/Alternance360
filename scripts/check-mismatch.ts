
import db from '../lib/db';

async function checkMismatch() {
    const refs = await db.referentiel.findMany({
        where: { codeRncp: { in: ['RNCP38565', 'RNCP39583'] } }
    });
    console.log('Referentiels for RNCP38565 and RNCP39583:', JSON.stringify(refs, null, 2));
}

checkMismatch()
    .catch(err => console.error(err))
    .finally(() => process.exit());
