
import db from '../lib/db';

async function repair() {
    console.log('Starting repair...');

    // 1. Find the incorrect record
    const incorrectRef = await db.referentiel.findFirst({
        where: { codeRncp: 'RNCP38565' },
        include: { _count: { select: { contracts: true, blocs: true } } }
    });

    if (!incorrectRef) {
        console.log('RNCP38565 not found.');
        return;
    }

    console.log('Mismatched Record found:', incorrectRef.id, incorrectRef.title);

    // 2. Check if RNCP39583 already exists
    const existingCorrectCode = await db.referentiel.findFirst({
        where: { codeRncp: 'RNCP39583' }
    });

    if (existingCorrectCode) {
        console.log('RNCP39583 already exists. Deleting it to make room for the fix...');
        await db.referentiel.delete({ where: { id: existingCorrectCode.id } });
    }

    // 3. Rename RNCP38565 -> RNCP39583
    console.log('Renaming RNCP38565 to RNCP39583...');
    await db.referentiel.update({
        where: { id: incorrectRef.id },
        data: {
            codeRncp: 'RNCP39583',
            title: 'Expert en développement logiciel' // Ensure title is correct
        }
    });

    // 4. Create the real RNCP38565 (Placeholder for now, user can re-import)
    console.log('Creating correct RNCP38565 (CAP - Accompagnant éducatif petite enfance)...');
    await db.referentiel.create({
        data: {
            codeRncp: 'RNCP38565',
            title: 'CAP - Accompagnant éducatif petite enfance',
            isGlobal: true,
            certificationLevel: 'Niveau 3'
        }
    });

    console.log('Repair completed successfully.');
}

repair()
    .catch(err => console.error(err))
    .finally(() => process.exit());
