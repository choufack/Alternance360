import { auth } from '@/auth'
import db from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { JourneyGenerator } from '@/components/admin/journey-generator'
import { GenerateLivretButton } from '@/components/pdf/generate-livret-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    UserCircle2,
    Mail,
    Calendar,
    FileText,
    Building2,
    ShieldCheck,
    GraduationCap,
    Clock,
    ArrowRight,
    ArrowLeft,
    Sparkles
} from 'lucide-react'
import Link from 'next/link'

export default async function ApprenticeProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) redirect('/login')

    const apprentice = await db.user.findUnique({
        where: { id },
        include: {
            contracts: {
                include: {
                    referentiel: {
                        include: {
                            _count: { select: { blocs: true } }
                        }
                    },
                    tsfMapping: {
                        select: { id: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: 1
            }
        }
    })

    if (!apprentice) notFound()

    const activeContract = apprentice.contracts[0]
    const hasJourney = (activeContract?.tsfMapping?.length ?? 0) > 0

    return (
        <div className="container mx-auto py-12 px-4 max-w-6xl space-y-8">
            {/* Back Navigation */}
            <div className="-mb-4">
                <Button variant="ghost" size="sm" asChild className="text-slate-500 hover:text-slate-900 -ml-2">
                    <Link href="/admin/users" className="flex items-center gap-2">
                        <ArrowLeft size={16} />
                        Retour à la liste
                    </Link>
                </Button>
            </div>

            {/* Header / Identity */}
            <header className="flex flex-col md:flex-row items-center gap-8 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/40">
                <div className="w-32 h-32 rounded-[2.5rem] bg-slate-100 flex items-center justify-center text-slate-400 border-4 border-white shadow-inner">
                    <UserCircle2 size={64} />
                </div>
                <div className="flex-1 text-center md:text-left">
                    <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 mb-3">
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">{apprentice.fullName}</h1>
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 gap-1.5 px-3 h-7 font-bold uppercase tracking-widest text-[10px]">
                            <GraduationCap size={14} /> Apprenti
                        </Badge>
                    </div>
                    <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-center md:items-start text-slate-500 font-medium">
                        <div className="flex items-center gap-2">
                            <Mail size={18} className="text-slate-400" />
                            {apprentice.email}
                        </div>
                        <div className="flex items-center gap-2">
                            <Building2 size={18} className="text-slate-400" />
                            {apprentice.companyName || "Entreprise non assignée"}
                        </div>
                    </div>
                </div>

                {activeContract && (
                    <div className="flex flex-col items-center md:items-end gap-3 px-8 py-4 bg-slate-50 rounded-[2rem]">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contrat Actif</div>
                        <div className="text-lg font-black text-slate-900">{activeContract.referentiel?.codeRncp || "Inconnu"}</div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-full shadow-sm">
                            <Calendar size={12} />
                            {new Date(activeContract.startDate).toLocaleDateString()}
                            <ArrowRight size={10} />
                            {new Date(activeContract.endDate).toLocaleDateString()}
                        </div>
                    </div>
                )}
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Journey Status */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="rounded-[2.5rem] border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                        <CardHeader className="p-10 pb-4">
                            <CardTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                <FileText className="text-indigo-600" />
                                Parcours Pédagogique (TSF)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-10 pt-6">
                            {!activeContract ? (
                                <div className="py-12 text-center space-y-4">
                                    <div className="w-16 h-16 mx-auto bg-slate-50 flex items-center justify-center rounded-3xl text-slate-300">
                                        <FileText size={32} />
                                    </div>
                                    <p className="text-slate-500 font-medium">Aucun contrat actif détecté pour cet apprenti. Créez un contrat pour générer son parcours.</p>
                                    <Link href="/admin/contracts">
                                        <Button className="rounded-2xl gap-2 font-bold px-8">Aller à la gestion des contrats</Button>
                                    </Link>
                                </div>
                            ) : hasJourney ? (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                                            <ShieldCheck size={28} />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-emerald-900">TSF Opérationnel</h4>
                                            <p className="text-emerald-700/70 text-sm font-medium">Le plan de formation a été industrialisé. Conformité Qualiopi active.</p>
                                        </div>
                                        <div className="ml-auto">
                                            <Badge className="bg-emerald-600 text-white border-none shadow-lg shadow-emerald-200">ID: {(activeContract as any).versionId}</Badge>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-6 bg-slate-50 rounded-3xl text-center">
                                            <div className="text-3xl font-black text-slate-900">{activeContract.tsfMapping.length}</div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Compétences</div>
                                        </div>
                                        <div className="p-6 bg-slate-50 rounded-3xl text-center">
                                            <div className="text-3xl font-black text-slate-900">{(activeContract as any).periodType === 'SEMESTER' ? '6m' : '3m'}</div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Périodicité</div>
                                        </div>
                                        <div className="p-6 bg-slate-50 rounded-3xl text-center">
                                            <div className="text-3xl font-black text-slate-900">100%</div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Complétude</div>
                                        </div>
                                    </div>

                                    <Link href={`/admin/users/${apprentice.id}/tsf`} className="w-full">
                                        <Button variant="outline" className="w-full h-14 rounded-2xl border-2 border-slate-100 font-bold hover:bg-slate-50 transition-all">
                                            Consulter le Tableau de Suivi Complet
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="py-12 text-center space-y-6">
                                    <div className="w-16 h-16 mx-auto bg-indigo-50 flex items-center justify-center rounded-3xl text-indigo-300">
                                        <Sparkles size={32} />
                                    </div>
                                    <div className="max-w-xs mx-auto">
                                        <h3 className="text-xl font-black text-slate-900 mb-2">Parcours non généré</h3>
                                        <p className="text-slate-500 font-medium text-sm">Préparez le livret de suivi en transformant le référentiel RNCP en plan de formation trimestriel ou semestriel.</p>
                                    </div>

                                    <JourneyGenerator
                                        contractId={activeContract.id}
                                        referentielTitle={activeContract.referentiel?.title || "N/A"}
                                        blocCount={activeContract.referentiel?._count?.blocs || 0}
                                        durationMonths={activeContract.startDate && activeContract.endDate
                                            ? Math.ceil((new Date(activeContract.endDate).getTime() - new Date(activeContract.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
                                            : 0}
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Mini Stats/Actions */}
                <div className="space-y-8">
                    <Card className="rounded-[2.5rem] border-slate-100 shadow-xl shadow-slate-200/40">
                        <CardHeader className="p-8">
                            <CardTitle className="text-lg font-black text-slate-900 tracking-tight">Vigilance & Suivi</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-0 space-y-4">
                            <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                                <Clock className="text-orange-500" size={20} />
                                <div>
                                    <div className="text-xs font-black text-orange-900 uppercase">Prochaine Échéance</div>
                                    <div className="text-sm font-bold text-orange-800">Entretien de démarrage</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <ShieldCheck className="text-slate-400" size={20} />
                                <div>
                                    <div className="text-xs font-black text-slate-500 uppercase">Qualiopi</div>
                                    <div className="text-sm font-bold text-slate-700">Dossier complet à 60%</div>
                                </div>
                            </div>

                            {activeContract && (
                                <div className="pt-4 border-t border-slate-50">
                                    <GenerateLivretButton
                                        contractId={activeContract.id}
                                        buttonText="Générer Livret PDF"
                                        className="w-full h-12 rounded-2xl font-black uppercase tracking-wider text-[10px]"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
