import { auth } from '@/auth'
import db from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
    const session = await auth()
    let dbUser = null

    if (session?.user?.id) {
        dbUser = await db.user.findUnique({ where: { id: session.user.id } })
    }

    return NextResponse.json({
        session,
        dbUser
    })
}
