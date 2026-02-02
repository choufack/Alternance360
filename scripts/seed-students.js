const { PrismaClient } = require('@prisma/client')
const { v4: uuidv4 } = require('uuid')

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding Students...')

    // 1. Get or Create Tenant
    let tenant = await prisma.tenant.findFirst()
    if (!tenant) {
        tenant = await prisma.tenant.create({
            data: {
                name: "Demo Tenant",
                id: uuidv4()
            }
        })
    }

    // 2. Create Filiere & Promotion
    const filiere = await prisma.filiere.create({
        data: {
            name: "Concepteur Développeur d'Applications",
            tenantId: tenant.id
        }
    })

    const promo = await prisma.promotion.create({
        data: {
            name: "CDA 2025 - Paris",
            year: 2025,
            startDate: new Date('2025-09-01'),
            endDate: new Date('2026-09-01'),
            tenantId: tenant.id,
            filiereId: filiere.id
        }
    })

    console.log(`Created Promotion: ${promo.name}`)

    // 3. Create Students
    const students = [
        { firstName: "Thomas", lastName: "Anderson", email: "neo@matrix.com" },
        { firstName: "Trinity", lastName: "Moss", email: "trinity@matrix.com" },
        { firstName: "Morpheus", lastName: "Dorne", email: "morpheus@matrix.com" },
        { firstName: "Smith", lastName: "Agent", email: "smith@matrix.com" },
        { firstName: "Cypher", lastName: "Reagan", email: "cypher@matrix.com" }
    ]

    // Need a Referentiel to link contracts to (for TSF)
    const ref = await prisma.referentiel.findFirst()
    if (!ref) {
        console.warn("⚠️ No Referentiel found! Students will be created but contracts might be incomplete.")
    }

    for (const s of students) {
        const user = await prisma.user.upsert({
            where: { email: s.email },
            update: {},
            create: {
                email: s.email,
                firstName: s.firstName,
                lastName: s.lastName,
                role: 'apprentice',
                tenantId: tenant.id,
                promotionId: promo.id,
                password: 'password123' // Dummy password
            }
        })

        // Create Contract
        if (ref) {
            await prisma.contract.create({
                data: {
                    startDate: new Date('2025-09-01'),
                    endDate: new Date('2026-09-01'),
                    tenantId: tenant.id,
                    userId: user.id,
                    referentielId: ref.id,
                    tsfStatus: 'DRAFT'
                }
            })
        }
        console.log(`+ Added ${s.firstName} ${s.lastName}`)
    }

    console.log('✅ Seeding complete!')
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
