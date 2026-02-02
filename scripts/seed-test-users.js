const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
    console.log('🚀 Seeding test users for all profiles...')

    const password = 'password123'
    const hashedPassword = await bcrypt.hash(password, 10)

    // 1. Create a Default Tenant
    const tenant = await prisma.tenant.upsert({
        where: { siret: '12345678901234' },
        update: {},
        create: {
            name: 'CFA Descartes',
            siret: '12345678901234',
            primaryColor: '#4f46e5',
        },
    })
    console.log(`✅ Tenant created: ${tenant.name}`)

    // 2. Create Users for each role
    const users = [
        {
            email: 'superadmin@alternance360.fr',
            fullName: 'Super Admin',
            role: 'super_admin',
            tenantId: null
        },
        {
            email: 'admin@demo.com',
            fullName: 'Admin CFA',
            role: 'admin',
            tenantId: tenant.id
        },
        {
            email: 'tutor@demo.com',
            fullName: 'Tuteur Entreprise',
            role: 'tutor',
            tenantId: tenant.id
        },
        {
            email: 'apprentice@demo.com',
            fullName: 'Apprenti Test',
            role: 'apprentice',
            tenantId: tenant.id
        },
        {
            email: 'trainer@demo.com',
            fullName: 'Formateur/Intervenant',
            role: 'trainer',
            tenantId: tenant.id
        }
    ]

    for (const userData of users) {
        const user = await prisma.user.upsert({
            where: { email: userData.email },
            update: {
                role: userData.role,
                password: hashedPassword,
                tenantId: userData.tenantId
            },
            create: {
                email: userData.email,
                password: hashedPassword,
                fullName: userData.fullName,
                role: userData.role,
                tenantId: userData.tenantId
            },
        })
        console.log(`✅ User created: ${user.fullName} (${user.role}) - ${user.email}`)
    }

    console.log('\n--- Accès Utilisateurs ---')
    console.log('Mot de passe pour tous : password123\n')
    users.forEach(u => console.log(`${u.role.padEnd(15)} : ${u.email}`))
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
