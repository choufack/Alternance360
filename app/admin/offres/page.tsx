import { auth } from '@/auth'
import db from '@/lib/db'
import { redirect } from 'next/navigation'
import { OfferList } from '@/components/admin/offers/offer-list'
import { OfferForm } from '@/components/admin/offers/offer-form'
import {
    Briefcase,
    LayoutGrid,
    Search
} from 'lucide-react'
import { getOffers } from '@/app/actions/offers'

export default async function OffersPage() {
    const session = await auth()
    if (!session?.user?.id) redirect('/login')

    const user = await db.user.findUnique({ where: { id: session.user.id } })
    if (!user || !user.tenantId || (user.role !== 'admin' && user.role !== 'super_admin')) {
        return <div className="p-8 text-red-600 font-bold">Accès refusé</div>
    }

    // Fetch Data Parallelized
    const [offers, referentiels] = await Promise.all([
        getOffers(),
        db.referentiel.findMany({
            where: {
                OR: [
                    { tenantId: user.tenantId },
                    { isGlobal: true } // Can offers be based on global refs? Yes if imported? Or just global?
                    // Usually you import it first? But schema allows linking to any global ref available?
                    // Let's assume for now we link to ANY ref available to the tenant.
                ]
            },
            select: { id: true, title: true, codeRncp: true, isMarketplacePack: true },
            orderBy: { title: 'asc' }
        })
    ])

    return (
        <div className="container mx-auto py-8 text-slate-900">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-[0.2em] mb-2">
                        <Briefcase size={14} />
                        <span>Commercialisation</span>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-none mb-3">
                        Catalogue Offres<span className="text-indigo-500">.</span>
                    </h1>
                    <p className="text-slate-500 font-medium text-lg max-w-xl">
                        Transformez vos référentiels en produits de formation. Définissez vos sessions, prix et modalités pour ouvrir les inscriptions.
                    </p>
                </div>

                <div className="flex gap-3">
                    <OfferForm referentiels={referentiels} />
                </div>
            </header>

            <div className="mb-8 flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher une offre..."
                        className="w-full h-12 pl-12 pr-4 bg-white border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                </div>
            </div>

            {offers.length > 0 ? (
                <OfferList offers={offers} referentiels={referentiels} />
            ) : (
                <div className="py-24 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-400">
                        <Briefcase size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-3">Aucune offre active</h3>
                    <p className="text-slate-500 max-w-md mx-auto mb-8">
                        Vous n'avez pas encore créé d'offre commerciale.
                    </p>
                    <OfferForm referentiels={referentiels} />
                </div>
            )}
        </div>
    )
}
