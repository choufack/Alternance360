import { auth } from '@/auth'
import db from '@/lib/db'
import { redirect } from 'next/navigation'
import { Store, Plus, CheckCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MarketplaceItem } from '@/components/admin/marketplace-item'
import { ReferentielSearch } from '@/components/admin/referentiel-search'

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    const session = await auth()
    if (!session || !session.user || !session.user.id) redirect('/login')

    const { q: search } = await searchParams
    const tenantId = session.user.tenantId

    // Fetch Global Referentiels
    let globalReferentiels = await db.referentiel.findMany({
        where: { isGlobal: true },
        include: {
            _count: { select: { blocs: true } }
        },
        orderBy: { title: 'asc' }
    })

    // Search filtering (in-memory for speed/simplicity since dataset is cleaned & small)
    if (search) {
        const lowerSearch = search.toLowerCase()
        globalReferentiels = globalReferentiels.filter(ref =>
            ref.title.toLowerCase().includes(lowerSearch) ||
            ref.codeRncp.toLowerCase().includes(lowerSearch)
        )
    }

    // Fetch existing local refs to check if already added
    const localRefs = tenantId ? await db.referentiel.findMany({
        where: { isGlobal: false, tenantId },
        select: { codeRncp: true }
    }) : []

    const addedCodes = new Set(localRefs.map(r => r.codeRncp))

    return (
        <div className="container mx-auto py-12 space-y-12">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-[0.2em] mb-2">
                        <Store size={14} />
                        <span>Catalogue Officiel</span>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-none mb-3">
                        Marketplace<span className="text-indigo-500">.</span>
                    </h1>
                    <p className="text-slate-500 font-medium text-lg max-w-xl">
                        Explorez et importez les référentiels RNCP officiels dans votre atelier.
                    </p>
                </div>
            </header>

            {/* SEARCH BAR */}
            <div className="max-w-2xl">
                <ReferentielSearch />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {globalReferentiels.map(ref => (
                    <MarketplaceItem
                        key={ref.id}
                        referentiel={ref}
                        isAdded={addedCodes.has(ref.codeRncp)}
                        userRole={session.user.role}
                    />
                ))}
            </div>

            {globalReferentiels.length === 0 && (
                <div className="py-24 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
                    <h3 className="text-2xl font-black text-slate-900 mb-3">Aucun résultat</h3>
                    <p className="text-slate-500 max-w-md mx-auto">
                        {search
                            ? `Aucun référentiel ne correspond à votre recherche "${search}".`
                            : "Les référentiels globaux apparaîtront ici une fois importés par le Super Admin."
                        }
                    </p>
                </div>
            )}
        </div>
    )
}
