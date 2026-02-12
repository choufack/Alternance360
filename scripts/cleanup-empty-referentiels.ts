
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
    console.log('Scanning for empty referentiels...')

    const allRefs = await db.referentiel.findMany({
        include: {
            _count: {
                select: { blocs: true }
            }
        }
    })

    const emptyRefs = allRefs.filter(r => r._count.blocs === 0)
    console.log(`Found ${emptyRefs.length} referentiels with 0 blocks.`)

    if (emptyRefs.length > 0) {
        console.log('Deleting...')
        const result = await db.referentiel.deleteMany({
            where: {
                id: { in: emptyRefs.map(r => r.id) }
            }
        })
        console.log(`Deleted ${result.count} empty referentiels.`)
    } else {
        console.log('No empty referentiels found.')
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await db.$disconnect())
