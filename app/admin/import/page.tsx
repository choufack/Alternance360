import { RNCPImporter } from '@/components/admin/rncp-importer'
import { auth } from '@/auth'
import db from '@/lib/db'
import { redirect } from 'next/navigation'

export default async function ImportPage() {
    const session = await auth()
    if (!session || !session.user || !session.user.id) {
        redirect('/login')
    }

    const user = await db.user.findUnique({
        where: { id: session.user.id }
    })

    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        redirect('/admin')
    }

    // Note: In this local setup, the tenant_id might be the same for everyone
    // or fetched from the user. For the importer, we can pass the user's tenantId.
    const tenantId = user.tenantId || "00000000-0000-0000-0000-000000000000"

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
            <h1 className="text-3xl font-bold mb-8 tracking-tight">Antigravity Admin</h1>
            <RNCPImporter tenantId={tenantId} />
            {/* <div className="bg-red-100 p-4 text-red-900">Importer Temporarily Disabled for Debugging</div> */}
        </div>
    )
}
