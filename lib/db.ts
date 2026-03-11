import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
    return new PrismaClient()
}

declare global {
    // Unique global key to bypass cache from previous sessions
    var prisma_v5: undefined | ReturnType<typeof prismaClientSingleton>
}

const db = globalThis.prisma_v5 ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.prisma_v5 = db

export default db
