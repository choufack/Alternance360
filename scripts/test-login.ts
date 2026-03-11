import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function testAuth() {
    const email = 'superadmin@alternance360.fr'
    const password = 'password123'

    const user = await db.user.findUnique({
        where: { email },
        select: { id: true, email: true, password: true, role: true }
    })

    if (!user) {
        console.log(`User ${email} found: false`)
        return
    }
    console.log(`User ${email} found: true`)
    if (!user.password) {
        console.log(`User ${email} has password: false`)
        return
    }

    const isValid = await bcrypt.compare(password, user.password)
    console.log(`Password matches 'password123': ${isValid}`)
}

testAuth()
    .catch(console.error)
    .finally(() => db.$disconnect())
