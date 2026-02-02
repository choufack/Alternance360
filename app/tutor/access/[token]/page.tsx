import { verifyMagicToken } from '@/app/actions/tutor'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Info } from 'lucide-react'
import { TutorMagicValidation } from '@/components/tutor/tutor-magic-validation'
import db from '@/lib/db'

export default async function TutorAccessPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params
    const data = await verifyMagicToken(token)

    if (!data) {
        return notFound()
    }

    const { tutor, contract, apprentice } = data
    if (!apprentice) return notFound()

    const proofs = await db.proof.findMany({
        where: { userId: apprentice.id, status: 'PENDING' },
        include: { competence: true },
        orderBy: { createdAt: 'desc' }
    })

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="mx-auto max-w-4xl">
                {/* Header Branding */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{contract.tenant.name}</h1>
                        <p className="text-slate-500 text-sm">Espace Tuteur Entreprise</p>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {/* Sidebar Info */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Apprenti</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                        {apprentice?.fullName?.split(' ').map((n: string) => n[0]).join('')}
                                    </div>
                                    <div>
                                        <p className="font-medium">{apprentice?.fullName}</p>
                                        <p className="text-xs text-slate-500">{apprentice?.email}</p>
                                    </div>
                                </div>
                                <div className="text-sm">
                                    <p className="text-slate-500">Formation</p>
                                    <p className="font-semibold">{contract.referentiel?.title || 'RNCP non spécifié'}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-amber-50 border-amber-200">
                            <CardContent className="pt-6">
                                <div className="flex gap-3">
                                    <AlertTriangle className="text-amber-600 h-5 w-5 shrink-0" />
                                    <div className="text-sm">
                                        <p className="font-bold text-amber-900">Action Requise</p>
                                        <p className="text-amber-800">Votre validation est nécessaire pour clore la période actuelle du livret.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content */}
                    <div className="md:col-span-2 space-y-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Preuves de compétences</CardTitle>
                                <Badge variant="outline">{contract.tsfStatus}</Badge>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-500 text-sm mb-6">
                                    Veuillez passer en revue les activités réalisées par l'apprenti en entreprise et valider sa progression.
                                </p>

                                <TutorMagicValidation
                                    proofs={proofs}
                                    contractId={contract.id}
                                    apprentice={apprentice}
                                />

                                <div className="mt-8 pt-6 border-t">
                                    <h3 className="font-bold mb-4">Avis Global du Tuteur</h3>
                                    <textarea
                                        className="w-full min-h-[100px] p-3 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 transition-all border-slate-200"
                                        placeholder="Commentaires sur le comportement, l'implication and les résultats..."
                                    />
                                    <Button className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700">
                                        Signer and Valider le Livret pour cette période
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
