const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const users = await prisma.user.findMany({
        where: { role: 'apprentice' },
        select: {
            firstName: true,
            lastName: true,
            email: true,
            promotion: { select: { name: true } }
        }
    })
    console.log('--- LISTE DES APPRENANTS ---')
    if (users.length === 0) {
        console.log('Aucun apprenant trouvé.')
    } else {
        users.forEach(u => {
            console.log(`- ${u.firstName} ${u.lastName} (${u.email}) [Promo: ${u.promotion ? u.promotion.name : 'N/A'}]`)
        })
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
