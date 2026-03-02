import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import db from '@/lib/db'
import { uploadProof } from './actions'
import { UploadForm } from './upload-form'
import { CompetenceRadar } from '@/components/pedagogie/competence-radar'
import { MilestoneWidget } from '@/components/suivi/milestone-widget'
import { getContractHealth } from '../actions/monitoring'
import { GenerateLivretButton } from '@/components/pdf/generate-livret-button'
import {
    Plus,
    FileText,
    Image as ImageIcon,
    ExternalLink,
    Clock,
    CloudUpload,
    CheckCircle2,
    UserCircle,
    XCircle,
    Loader2,
    ArrowRight,
    Calendar as CalendarIcon
} from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
    const session = await auth()
    if (!session || !session.user || !session.user.id) {
        redirect('/login')
    }

    // Role-based redirection for non-apprentices
    if (session.user.role === 'admin') redirect('/admin')
    if (session.user.role === 'super_admin') redirect('/super-admin/leads')
    if (session.user.role === 'formateur') redirect('/formateur')
    if (session.user.role === 'tutor') redirect('/tutor')

    const [proofs, milestones, contract] = await Promise.all([
        db.proof.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' }
        }),
        db.milestone.findMany({
            where: { contract: { userId: session.user.id }, status: 'PENDING' },
            orderBy: { dueDate: 'asc' },
            take: 2
        }),
        db.contract.findFirst({
            where: { userId: session.user.id }
        })
    ])

    const health = contract ? await getContractHealth(contract.id) : null

    return (
        <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-10 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mon Espace Apprenti</h1>
                    <p className="text-slate-500 font-medium">Gérez vos preuves et suivez votre progression RNCP</p>
                </div>
                <div className="flex items-center gap-4">
                    {health && (
                        <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border ${health.status === 'GOOD' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                            health.status === 'WARNING' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                                'bg-rose-50 border-rose-100 text-rose-700'
                            }`}>
                            <div className={`w-2 h-2 rounded-full animate-pulse ${health.status === 'GOOD' ? 'bg-emerald-500' :
                                health.status === 'WARNING' ? 'bg-amber-500' : 'bg-rose-500'
                                }`} />
                            <span className="text-xs font-black uppercase tracking-wider">Score Santé: {health.score}</span>
                        </div>
                    )}
                    <Link
                        href="/profile"
                        className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold py-2 px-4 rounded-2xl border border-slate-200 transition-all active:scale-95"
                    >
                        <UserCircle size={18} className="text-slate-400" />
                        Profil
                    </Link>

                    {contract && (
                        <GenerateLivretButton
                            contractId={contract.id}
                            variant="outline"
                            className="bg-white hover:bg-slate-50 text-slate-700 font-bold py-2 px-4 h-auto rounded-2xl border border-slate-200 transition-all active:scale-95"
                            buttonText="Livret PDF"
                        />
                    )}
                    <div className="flex items-center gap-3 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-bold text-indigo-700 hidden sm:inline">Session active</span>
                    </div>
                </div>
            </div>

            {/* Stats & Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-1 space-y-4">
                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                        <h3 className="text-sm font-black uppercase text-slate-400 mb-4 tracking-widest">Compétences</h3>
                        <div className="text-4xl font-black text-slate-900">{proofs.filter(p => p.status === 'VALIDATED').length}</div>
                        <p className="text-xs text-slate-400 mt-1 font-medium">Validées au total</p>
                    </div>

                    <MilestoneWidget milestones={milestones as any} />

                    {/* Navigation Cards */}
                    <Link href="/pedagogie/positionnement" className="block group">
                        <div className="bg-blue-600 p-5 rounded-[2rem] shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-[1.02] transition-all">
                            <div className="flex items-center justify-between text-white mb-2">
                                <h3 className="font-bold">Positionnement</h3>
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                            <p className="text-blue-100 text-xs">Diagnostiquez vos acquis initiaux.</p>
                        </div>
                    </Link>

                    <Link href="/pedagogie/tsf" className="block group">
                        <div className="bg-white border border-slate-200 p-5 rounded-[2rem] shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
                            <div className="flex items-center justify-between text-slate-800 mb-2">
                                <h3 className="font-bold">Mon TSF</h3>
                                <ArrowRight size={20} className="text-indigo-400 group-hover:translate-x-1 transition-transform" />
                            </div>
                            <p className="text-slate-500 text-xs">Planning de formation.</p>
                        </div>
                    </Link>
                    <Link href="/suivi/calendrier" className="block group">
                        <div className="bg-indigo-600 p-5 rounded-[2rem] shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-[1.02] transition-all">
                            <div className="flex items-center justify-between text-white mb-2">
                                <h3 className="font-bold">Mon Calendrier</h3>
                                <CalendarIcon size={20} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                            <p className="text-indigo-100 text-xs">Périodes CFA & Entreprise.</p>
                        </div>
                    </Link>
                </div>
                <div className="md:col-span-3">
                    <div className="bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden h-full">
                        <div className="h-full min-h-[300px]">
                            {/* Import CompetenceRadar dynamically or directly */}
                            <CompetenceRadar />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                {/* Colonne Gauche : Formulaire d'upload */}
                <div className="lg:col-span-1">
                    <UploadForm />
                </div>

                {/* Colonne Droite : Liste des preuves */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                        <CheckCircle2 className="text-emerald-500" size={24} />
                        Mes derniers dépôts
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {proofs && proofs.length > 0 ? (
                            proofs.map((proof) => (
                                <div key={proof.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                            {proof.type === 'PDF' ? <FileText size={24} /> : <ImageIcon size={24} />}
                                        </div>
                                        <a
                                            href={proof.url}
                                            target="_blank"
                                            className="p-2 text-slate-300 hover:text-indigo-500 transition-colors"
                                            title="Voir le document"
                                        >
                                            <ExternalLink size={18} />
                                        </a>
                                    </div>

                                    <h3 className="font-bold text-slate-900 truncate mb-1">{proof.title}</h3>

                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                                        <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                                            <Clock size={12} />
                                            <span>Le {new Date(proof.createdAt).toLocaleDateString('fr-FR')}</span>
                                        </div>

                                        {proof.status === 'VALIDATED' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-bold">
                                                <CheckCircle2 size={12} /> Validé
                                            </span>
                                        )}
                                        {proof.status === 'REJECTED' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 text-rose-600 text-xs font-bold">
                                                <XCircle size={12} /> Refusé
                                            </span>
                                        )}
                                        {(!proof.status || proof.status === 'PENDING') && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-600 text-xs font-bold">
                                                <Loader2 size={12} className="animate-spin" /> En attente
                                            </span>
                                        )}
                                    </div>

                                    {proof.feedback && (
                                        <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
                                            <span className="font-bold text-slate-900 block mb-1">Commentaire du tuteur :</span>
                                            {proof.feedback}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center bg-slate-100/50 rounded-[3rem] border-2 border-dashed border-slate-200">
                                <FileText className="mx-auto text-slate-300 mb-4" size={48} />
                                <p className="text-slate-500 font-bold">Aucune preuve déposée pour le moment.</p>
                                <p className="text-slate-400 text-sm mt-1">Commencez par remplir le formulaire à gauche.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}
