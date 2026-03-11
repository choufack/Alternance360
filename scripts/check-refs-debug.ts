import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function checkReferentiels() {
    const globals = await db.referentiel.findMany({
        where: { isGlobal: true },
        select: { id: true, codeRncp: true, title: true }
    })
    console.log(`\n=== Global Referentiels (${globals.length}) ===`)
    globals.forEach((r: any) => console.log(` - [${r.codeRncp}] ${r.title}`))

    const locals = await db.referentiel.findMany({
        where: { isGlobal: false },
        select: { id: true, codeRncp: true, title: true, tenantId: true }
    })
    console.log(`\n=== Local Referentiels (${locals.length}) ===`)
    locals.forEach((r: any) => console.log(` - [${r.codeRncp}] ${r.title} (tenant: ${r.tenantId})`))
}

checkReferentiels().catch(console.error).finally(() => db.$disconnect())
