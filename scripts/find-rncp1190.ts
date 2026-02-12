
import db from '../lib/db';

async function findRncp() {
    const refs = await db.referentiel.findMany({
        where: { codeRncp: 'RNCP1190' },
        include: { _count: { select: { blocs: true, contracts: true, trainingOffers: true, filieres: true } } }
    });
    console.log('Referentiels for RNCP1190:', JSON.stringify(refs, null, 2));
}

findRncp()
    .catch(err => console.error(err))
    .finally(() => process.exit());
