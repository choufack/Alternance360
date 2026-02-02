
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const refCount = await prisma.referentiel.count()
    const blocCount = await prisma.blocCompetence.count()
    const compCount = await prisma.competence.count()
    console.log({ refCount, blocCount, compCount })
}

main().catch(console.error).finally(() => prisma.$disconnect())
