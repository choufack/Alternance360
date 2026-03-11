/**
 * Fix: Assign orphan referentiels (tenantId = null, isGlobal = false)
 * to the default tenant.
 * Run with: npx tsx scripts/fix-null-tenant-refs.ts
 */
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function fixOrphanRefs() {
    // Get the first tenant (the CFA demo tenant)
    const tenant = await db.tenant.findFirst()
    if (!tenant) {
        console.error('No tenant found! Cannot assign.')
        return
    }
    console.log(`Will assign to tenant: ${tenant.name} (${tenant.id})`)

    // Find orphan referentiels
    const orphans = await db.referentiel.findMany({
        where: { isGlobal: false, tenantId: null }
    })
    console.log(`Found ${orphans.length} orphan referentiels`)

    for (const ref of orphans) {
        console.log(` - Fixing [${ref.codeRncp}] ${ref.title}...`)

        await db.referentiel.update({
            where: { id: ref.id },
            data: { tenantId: tenant.id }
        })

        // Also fix blocs
        await db.blocCompetence.updateMany({
            where: { referentielId: ref.id, tenantId: null },
            data: { tenantId: tenant.id }
        })

        // Also fix competences via blocs
        const blocs = await db.blocCompetence.findMany({
            where: { referentielId: ref.id }
        })
        for (const bloc of blocs) {
            await db.competence.updateMany({
                where: { blocId: bloc.id, tenantId: null },
                data: { tenantId: tenant.id }
            })
        }
    }

    console.log('\n✅ Done! All orphan referentiels assigned to tenant.')
}

fixOrphanRefs().catch(console.error).finally(() => db.$disconnect())
