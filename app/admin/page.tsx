import { auth } from '@/auth'
import db from '@/lib/db'
import { redirect } from 'next/navigation'
import {
    getWorkflowSupervision,
    getGouvernanceKPIs,
    getGovernanceInsights,
    getActivityFeed,
    getContractsHealthOverview
} from '@/app/actions/supervision'
import { WorkflowSupervision } from '@/components/admin/workflow-supervision'
import { AdminVision } from '@/components/admin/admin-vision'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, Activity } from 'lucide-react'

export default async function AdminDashboardPage({
    searchParams
}: {
    searchParams: Promise<{ refId?: string, formId?: string }>
}) {
    const resolvedSearchParams = await searchParams
    const session = await auth()
    if (!session?.user?.id) redirect('/login')

    const user = await db.user.findUnique({ where: { id: session.user.id } })
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'formateur')) {
        return <div>Accès refusé</div>
    }

    const filters = {
        referentielId: resolvedSearchParams?.refId,
        formateurId: resolvedSearchParams?.formId
    }

    const [stats, kpis, insights, activities, risks, referentiels, formateurs] = await Promise.all([
        getWorkflowSupervision(),
        getGouvernanceKPIs(filters),
        getGovernanceInsights(filters),
        getActivityFeed(),
        getContractsHealthOverview(filters),
        db.referentiel.findMany({ where: { isGlobal: false, tenantId: session.user.tenantId } }),
        db.user.findMany({ where: { role: 'formateur', tenantId: session.user.tenantId } })
    ])

    return (
        <div className="container mx-auto py-12 px-4 max-w-6xl space-y-12">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Tableau de Bord</h1>
                    <p className="text-slate-500 font-medium text-lg">Tour de contrôle Qualiopi et pilotage de la performance pédagogique.</p>
                </div>
            </header>

            <Tabs defaultValue="vision" className="space-y-8">
                <TabsList className="bg-slate-100/50 p-1.5 rounded-[1.5rem] border border-slate-200">
                    <TabsTrigger value="vision" className="rounded-2xl px-8 py-2.5 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-xl shadow-indigo-100 font-bold gap-2">
                        <BarChart3 size={18} /> Vision Stratégique
                    </TabsTrigger>
                    <TabsTrigger value="workflow" className="rounded-2xl px-8 py-2.5 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-xl shadow-indigo-100 font-bold gap-2">
                        <Activity size={18} /> Suivi des Flux
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="vision">
                    <AdminVision
                        kpis={kpis}
                        insights={insights}
                        activities={activities}
                        risks={risks}
                        referentiels={referentiels as any}
                        formateurs={formateurs as any}
                        currentFilters={filters}
                    />
                </TabsContent>

                <TabsContent value="workflow">
                    <WorkflowSupervision stats={stats} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
