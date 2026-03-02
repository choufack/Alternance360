import { auth } from '@/auth'
import db from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, Library } from 'lucide-react'
import { ReferentielGrid } from '@/components/admin/referentiel-grid'

export default async function AtelierPage() {
    const session = await auth()
    if (!session || !session.user || !session.user.id) {
        redirect('/login')
    }

    const user = await db.user.findUnique({
        where: { id: session.user.id }
    })

    if (!user || (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'formateur')) {
        return (
            <div className="container mx-auto py-8 text-center">
                <h1 className="text-2xl font-bold text-red-600">Accès Refusé</h1>
                <p className="mt-2 text-gray-600">Vous n'avez pas les droits nécessaires.</p>
            </div>
        )
    }

    const tenantId = session.user.tenantId
    const isSuperAdmin = user.role === 'super_admin'

    const allReferentiels = await db.referentiel.findMany({
        where: isSuperAdmin
            ? { isGlobal: false }
            : { isGlobal: false, tenantId: tenantId || undefined },
        include: {
            _count: { select: { blocs: true, contracts: true } }
        },
        orderBy: { createdAt: 'desc' }
    })

    return (
        <div className="container mx-auto py-8 space-y-12">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div>
                    <div className="flex items-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-[0.2em] mb-2">
                        <Library size={14} />
                        <span>Bibliothèque & Atelier</span>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-none mb-3">
                        Référentiels<span className="text-emerald-500">.</span>
                    </h1>
                    <p className="text-slate-500 font-medium text-lg max-w-xl">
                        Consultez le catalogue officiel RNCP et personnalisez vos filières.
                    </p>
                </div>

                <div className="flex gap-3">
                    <Link href="/admin/import">
                        <Button className="h-14 px-6 rounded-2xl bg-slate-900 hover:bg-emerald-600 font-bold shadow-xl shadow-slate-200 gap-2 transition-all">
                            <Plus size={18} />
                            Import XML
                        </Button>
                    </Link>
                </div>
            </header>

            <ReferentielGrid referentiels={allReferentiels} />
        </div>
    )
}
