import { auth } from '@/auth'
import db from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { ConfiguratorClient } from '@/components/admin/configurator-client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ConfiguratorPageProps {
    params: Promise<{ id: string }>
}

export default async function ConfiguratorPage({ params }: ConfiguratorPageProps) {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) redirect('/login')

    const user = await db.user.findUnique({ where: { id: session.user.id } })
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'formateur')) {
        return <div className="p-8 text-red-600 font-bold">Accès refusé</div>
    }

    // Fetch the full referentiel with nested structure
    const referentiel = await db.referentiel.findUnique({
        where: { id },
        include: {
            blocs: {
                orderBy: { orderIndex: 'asc' },
                include: {
                    competences: {
                        include: {
                            indicateurs: true
                        }
                    }
                }
            }
        }
    })

    if (!referentiel) notFound()

    // Verify tenant access
    if (referentiel.tenantId !== session.user.tenantId && user.role !== 'super_admin') {
        return <div className="p-8 text-red-600 font-bold">Accès non autorisé à ce référentiel</div>
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="container mx-auto py-6 px-4">
                <Button variant="ghost" size="sm" asChild className="text-slate-500 hover:text-slate-900 mb-4 -ml-2">
                    <Link href="/admin/referentiels" className="flex items-center gap-2">
                        <ArrowLeft size={16} />
                        Retour aux référentiels
                    </Link>
                </Button>
                <ConfiguratorClient referentiel={referentiel} />
            </div>
        </div>
    )
}
