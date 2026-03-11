import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import db from '@/lib/db'
import { getApprenticeInactivity, getContractsHealthOverview, getApprenticeProgressOverview } from '@/app/actions/supervision'
import { InactivityMonitor } from '@/components/suivi/inactivity-monitor'
import { HealthOverview } from '@/components/suivi/health-overview'
import { AttendanceManager } from '@/components/suivi/attendance-manager'
import { ApprenticeProgressTracker } from '@/components/suivi/apprentice-progress-tracker'
import { AlertTriangle, Activity, CheckCircle } from 'lucide-react'

export default async function SupervisionPage() {
    const session = await auth()
    if (!session || !session.user || !session.user.id) {
        redirect('/login')
    }

    const user = await db.user.findUnique({
        where: { id: session.user.id }
    })

    if (!user || (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'formateur')) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md">
                    <h1 className="text-2xl font-black text-slate-900 mb-2">Accès Refusé</h1>
                    <p className="text-slate-500 mb-6">Cet espace est réservé au suivi pédagogique.</p>
                </div>
            </div>
        )
    }

    const [stats, healthData, progressData, contracts] = await Promise.all([
        getApprenticeInactivity(),
        getContractsHealthOverview(),
        getApprenticeProgressOverview(),
        db.contract.findMany({
            where: user.role === 'formateur' ? { formateurId: user.id } : {},
            include: { user: { select: { fullName: true } } }
        })
    ])

    return (
        <div className="max-w-6xl mx-auto p-6 md:p-10 font-sans space-y-16">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-100 p-3 rounded-2xl">
                        <Activity className="text-indigo-600 w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pilotage Pédagogique</h1>
                        <p className="text-slate-500 font-medium">Surveillance proactive et conformité Qualiopi</p>
                    </div>
                </div>
            </div>

            <HealthOverview data={healthData} />

            <ApprenticeProgressTracker data={progressData} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 pt-10 border-t border-slate-100">
                <div className="lg:col-span-2">
                    <h2 className="text-2xl font-black text-slate-900 mb-6 px-2">Analyse Inactivité</h2>
                    <InactivityMonitor stats={stats} />
                </div>
                <div className="lg:col-span-1">
                    <h2 className="text-2xl font-black text-slate-900 mb-6 px-2">Assiduité</h2>
                    <AttendanceManager contracts={contracts as any} />
                </div>
            </div>
        </div>
    )
}
