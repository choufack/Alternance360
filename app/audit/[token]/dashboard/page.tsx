import { redirect } from 'next/navigation'
import { getAuditData } from '@/app/actions/audit'
import { AlertTriangle, Download, ShieldCheck, Eye, Search, FileText } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default async function AuditDashboard({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params
    let data
    try {
        data = await getAuditData(token)
    } catch (e) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center space-y-4">
                    <ShieldCheck size={64} className="mx-auto text-slate-300" />
                    <h1 className="text-xl font-black text-slate-900">Session expirée ou invalide</h1>
                    <p className="text-slate-500">Ce lien d'audit n'est plus actif. Veuillez contacter l'administrateur.</p>
                </div>
            </div>
        )
    }

    const { session, apprentices } = data

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            {/* AUDITOR WARNING BANNER */}
            <div className="bg-amber-100 border-b border-amber-200 text-amber-900 py-3 px-4 flex items-center justify-center gap-3 text-sm font-medium sticky top-0 z-50 shadow-sm backdrop-blur-md bg-amber-100/90">
                <AlertTriangle size={16} />
                <span>MODE AUDITEUR - LECTURE SEULE. Toutes les consultations sont tracées. Session expire le {new Date(session.expiresAt).toLocaleDateString()}.</span>
            </div>

            <main className="container mx-auto max-w-6xl p-6 space-y-8">
                {/* Header */}
                <header className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Portail de Conformité</h1>
                            <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 font-bold">Audit Qualiopi</Badge>
                        </div>
                        <p className="text-slate-500 text-lg">Espace de vérification sécurisé pour l'échantillon sélectionné ({apprentices.length} dossiers).</p>
                    </div>
                </header>

                {/* INDICATOR TABS */}
                <Tabs defaultValue="ind11" className="space-y-8">
                    <TabsList className="bg-white p-1.5 rounded-[1.5rem] border border-slate-200 shadow-sm w-full md:w-auto overflow-x-auto justify-start">
                        <TabsTrigger value="ind11" className="rounded-2xl px-6 py-2.5 data-[state=active]:bg-slate-900 data-[state=active]:text-white font-bold gap-2">
                            Indicateur 11 <span className="opacity-70 font-normal text-xs ml-1">(Individualisation)</span>
                        </TabsTrigger>
                        <TabsTrigger value="ind20" className="rounded-2xl px-6 py-2.5 data-[state=active]:bg-slate-900 data-[state=active]:text-white font-bold gap-2">
                            Indicateur 20 <span className="opacity-70 font-normal text-xs ml-1">(Suivi & Alertes)</span>
                        </TabsTrigger>
                        <TabsTrigger value="ind1" className="rounded-2xl px-6 py-2.5 data-[state=active]:bg-slate-900 data-[state=active]:text-white font-bold gap-2">
                            Indicateur 1 <span className="opacity-70 font-normal text-xs ml-1">(Information)</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Content: Indicateur 11 */}
                    <TabsContent value="ind11" className="space-y-6">
                        <QualiopiBadge
                            criterion="Critère 3"
                            indicator="Indicateur 11"
                            description="Il est démontré que les objectifs et contenus sont adaptés aux bénéficiaires lors de l'entrée en formation (positionnement)."
                        />

                        <div className="grid gap-6">
                            {apprentices.map((apprentice: any) => (
                                <ApprenticeCard key={apprentice.id} apprentice={apprentice} mode="ind11" />
                            ))}
                        </div>
                    </TabsContent>

                    {/* Content: Indicateur 20 */}
                    <TabsContent value="ind20" className="space-y-6">
                        <QualiopiBadge
                            criterion="Critère 5"
                            indicator="Indicateur 20"
                            description="Le prestataire met en œuvre le suivi et l'accompagnement des bénéficiaires et en retrace la vie."
                        />
                        <div className="grid gap-6">
                            {apprentices.map((apprentice: any) => (
                                <ApprenticeCard key={apprentice.id} apprentice={apprentice} mode="ind20" />
                            ))}
                        </div>
                    </TabsContent>

                    {/* Content: Indicateur 1 */}
                    <TabsContent value="ind1" className="space-y-6">
                        <QualiopiBadge
                            criterion="Critère 1"
                            indicator="Indicateur 1"
                            description="Le prestataire diffuse une information accessible au public (Programmes, Référentiels)."
                        />
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center text-slate-400">
                            <FileText size={48} className="mx-auto mb-4 opacity-20" />
                            <p>Les référentiels et programmes sont accessibles via le site public ou l'annuaire des formations.</p>
                            <div className="mt-4 flex justify-center gap-4">
                                {apprentices[0]?.contracts[0]?.referentiel && (
                                    <Card className="max-w-sm text-left">
                                        <CardContent className="p-4 flex gap-4 items-center">
                                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><FileText size={20} /></div>
                                            <div>
                                                <div className="font-bold text-slate-900">Référentiel {apprentices[0].contracts[0].referentiel.title}</div>
                                                <div className="text-xs text-slate-500">Version officielle</div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}

function QualiopiBadge({ criterion, indicator, description }: any) {
    return (
        <div className="bg-white border-l-4 border-emerald-500 p-6 rounded-r-2xl shadow-sm flex items-start gap-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                <ShieldCheck size={24} />
            </div>
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-slate-900 uppercase tracking-widest text-xs">{criterion}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="font-black text-emerald-600 uppercase tracking-widest text-xs">{indicator}</span>
                </div>
                <p className="text-slate-600 font-medium text-sm leading-relaxed max-w-2xl">{description}</p>
            </div>
        </div>
    )
}

function ApprenticeCard({ apprentice, mode }: { apprentice: any, mode: 'ind11' | 'ind20' }) {
    const contract = apprentice.contracts?.[0]

    return (
        <Card className="rounded-[2rem] border-slate-100 shadow-lg overflow-hidden group">
            <div className="bg-slate-50/50 p-6 flex justify-between items-center border-b border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-lg">
                        {apprentice.firstName?.[0]}{apprentice.lastName?.[0]}
                    </div>
                    <div>
                        <div className="font-bold text-slate-900 text-lg">{apprentice.fullName}</div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            {contract?.referentiel?.title || 'Sans Référentiel'}
                        </div>
                    </div>
                </div>
                <Button variant="outline" className="rounded-xl font-bold gap-2 text-slate-600">
                    <Eye size={16} /> Détails
                </Button>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-indigo-600 rounded-xl">
                    <Download size={18} />
                </Button>
            </div>

            <CardContent className="p-8">
                {mode === 'ind11' && (
                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Preuve 1 : Diagnostic Initial</h4>
                            {contract?.initialAssessments?.length > 0 ? (
                                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
                                    <ShieldCheck className="text-emerald-600" size={20} />
                                    <div>
                                        <div className="font-bold text-emerald-900">Diagnostic Réalisé</div>
                                        <div className="text-xs text-emerald-700">Le {new Date(contract.initialAssessments[0].createdAt).toLocaleDateString()}</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 italic text-sm">
                                    En attente de diagnostic
                                </div>
                            )}
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Preuve 2 : Parcours Adapté (TSF)</h4>
                            {/* Mock visualisation of TSF diff */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Durée Standard</span>
                                    <span className="font-bold text-slate-900">455h</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Allègements accordés</span>
                                    <span className="font-bold text-emerald-600">- 35h</span>
                                </div>
                                <div className="flex justify-between text-sm border-t border-slate-100 pt-2">
                                    <span className="text-slate-900 font-bold">Durée Contractuelle</span>
                                    <span className="font-black text-indigo-600">420h</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {mode === 'ind20' && (
                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Jalons & Suivi</h4>
                            <div className="space-y-3">
                                {contract?.milestones?.map((m: any, i: number) => (
                                    <div key={i} className="flex items-center gap-3 text-sm">
                                        <div className={cn("w-2 h-2 rounded-full", m.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-slate-300')} />
                                        <span className="font-medium text-slate-700">{m.type} - {new Date(m.dueDate).toLocaleDateString()}</span>
                                        {m.status === 'COMPLETED' && <Badge className="bg-emerald-100 text-emerald-700 border-none text-[10px]">Réalisé</Badge>}
                                    </div>
                                ))}
                                {(!contract?.milestones || contract.milestones.length === 0) && (
                                    <span className="text-slate-400 italic text-sm">Aucun jalon généré.</span>
                                )}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Journal de Bord</h4>
                            <div className="p-4 bg-slate-50 rounded-xl text-center">
                                <p className="text-slate-500 text-sm mb-2">Accès aux preuves de présence et activité</p>
                                <Button size="sm" variant="outline" className="w-full">Consulter l'historique</Button>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
