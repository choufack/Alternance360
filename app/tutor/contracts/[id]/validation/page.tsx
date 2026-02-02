import { auth } from '@/auth'
import db from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'
import { CompetenceRadar } from '@/components/pedagogie/competence-radar'
import { ClientSignature } from './client-signature'

export default async function ContractValidationPage({ params }: { params: { id: string } }) {
    const session = await auth()
    if (!session || !session.user || !session.user.id) redirect('/login')

    const contract = await db.contract.findUnique({
        where: { id: params.id },
        include: {
            user: true,
            referentiel: true
        }
    })

    if (!contract) return <div>Contrat introuvable</div>

    // Check if already signed
    const isSigned = !!contract.signedAt

    return (
        <div className="max-w-4xl mx-auto p-6 md:p-10 font-sans space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Validation du Livret</h1>
                    <p className="text-slate-500 font-medium">Bilan de fin de parcours pour {contract.user?.fullName}</p>
                </div>
                {isSigned && (
                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 font-bold">
                        <CheckCircle2 size={20} />
                        Livret Signé
                    </div>
                )}
            </div>

            {/* Bilan de Compétences */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="rounded-[2.5rem] overflow-hidden border-slate-100 shadow-sm">
                    <CardHeader className="bg-slate-50">
                        <CardTitle>Bilan des Compétences</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <CompetenceRadar userId={contract.userId || undefined} />
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="rounded-[2.5rem] border-slate-100 shadow-sm">
                        <CardHeader>
                            <CardTitle>Détails du Contrat</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm text-slate-400 font-bold uppercase">Apprenti</p>
                                <p className="font-bold text-slate-900">{contract.user?.fullName}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-400 font-bold uppercase">Référentiel</p>
                                <p className="font-bold text-slate-900">{contract.referentiel?.title || "N/A"}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-slate-400 font-bold uppercase">Début</p>
                                    <p className="font-bold text-slate-900">{contract.startDate.toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400 font-bold uppercase">Fin</p>
                                    <p className="font-bold text-slate-900">{contract.endDate.toLocaleDateString()}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {!isSigned ? (
                        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm">1</span>
                                Signature du Tuteur
                            </h3>
                            <ClientSignature contractId={contract.id} />
                        </div>
                    ) : (
                        <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-200 text-center">
                            <p className="text-slate-500 text-sm mb-2">Signé électroniquement le {contract.signedAt?.toLocaleString()}</p>
                            <img src={contract.tutorSignature!} alt="Signature Tuteur" className="h-20 mx-auto opacity-80" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
