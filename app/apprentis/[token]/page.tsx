
import { verifyMagicToken } from '@/app/actions/tutor';
import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Calendar, GraduationCap } from 'lucide-react';

export default async function ApprenticeSecurePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;

    // We reuse verifyMagicToken as it handles the logic of finding and validating the token
    const data = await verifyMagicToken(token);

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
                <Card className="max-w-md w-full rounded-[2rem] border-red-100 bg-white shadow-xl">
                    <CardContent className="p-12 text-center space-y-6">
                        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto">
                            <FileText size={40} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 mb-2">Lien invalide ou expiré</h1>
                            <p className="text-slate-500 font-medium">Ce lien d'accès sécurisé n'est plus valide. Veuillez demander un nouvel envoi à votre centre de formation.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Since we verified the token, we can redirect them to their actual dashboard 
    // OR show them a welcome landing page. For now, let's redirect to their livret page.
    // In a real app, we might want to set a transient session or cookie here.

    // For this implementation, we'll show a landing card then allow them to proceed.
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
            <Card className="max-w-2xl w-full rounded-[3rem] border-slate-100 bg-white shadow-2xl overflow-hidden">
                <div className="bg-indigo-600 p-12 text-white">
                    <div className="flex items-center gap-3 mb-4 opacity-80 uppercase tracking-widest text-[10px] font-black">
                        <GraduationCap size={16} />
                        <span>Espace Apprenti Sécurisé</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight mb-2">Bonjour, {data.contract.user?.firstName || 'étudiant'} !</h1>
                    <p className="text-indigo-100 font-medium">Votre livret de formation Alternance 360 est prêt.</p>
                </div>
                <CardContent className="p-12 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Filière</div>
                            <div className="font-bold text-slate-900">{data.contract.referentiel?.title || 'Formation'}</div>
                        </div>
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Période</div>
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                                <Calendar size={14} className="text-indigo-500" />
                                {new Date(data.contract.startDate).toLocaleDateString()}
                            </div>
                        </div>
                    </div>

                    <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 text-emerald-800 text-sm font-medium">
                        ✅ Vous avez un accès sécurisé temporaire pour consulter votre livret et valider vos compétences.
                    </div>

                    <a
                        href={`/apprentis/${token}/eval`}
                        className="flex items-center justify-center w-full bg-indigo-600 hover:bg-indigo-700 text-white h-16 rounded-2xl font-black text-lg transition-all shadow-lg shadow-indigo-200"
                    >
                        Démarrer mon auto-évaluation
                    </a>
                </CardContent>
            </Card>
        </div>
    );
}
