import { auth } from '@/auth'
import db from '@/lib/db'
import { redirect } from 'next/navigation'
import { ContractForm } from '@/components/admin/contract-management'

export default async function AdminContractsPage() {
    const session = await auth()
    if (!session?.user?.id) redirect('/login')

    const user = await db.user.findUnique({ where: { id: session.user.id } })
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        return <div>Accès refusé</div>
    }

    const tenantId = session.user.tenantId

    // Fetch data for form
    const apprentices = await db.user.findMany({
        where: { role: 'apprentice', tenantId: tenantId || undefined },
        select: { id: true, fullName: true, email: true }
    })

    const formateurs = await db.user.findMany({
        where: { role: 'formateur', tenantId: tenantId || undefined },
        select: { id: true, fullName: true, email: true }
    })

    const referentiels = await db.referentiel.findMany({
        where: { tenantId: tenantId || undefined },
        select: { id: true, title: true, codeRncp: true }
    })

    const allContracts = await db.contract.findMany({
        where: { tenantId: tenantId || undefined },
        include: {
            user: { select: { fullName: true, email: true } },
            formateur: { select: { fullName: true } },
            referentiel: { select: { title: true, codeRncp: true } }
        },
        orderBy: { createdAt: 'desc' }
    })

    return (
        <div className="container mx-auto py-8 space-y-12">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Gestion des Contrats</h1>

            <ContractForm
                apprentices={apprentices.map(a => ({ id: a.id, name: a.fullName || a.email }))}
                formateurs={formateurs.map(f => ({ id: f.id, name: f.fullName || f.email }))}
                referentiels={referentiels.map(r => ({ id: r.id, title: `${r.codeRncp} - ${r.title}` }))}
            />

            <ContractList contracts={allContracts as any} />
        </div>
    )
}

import { ContractList } from '@/components/admin/contract-list'
