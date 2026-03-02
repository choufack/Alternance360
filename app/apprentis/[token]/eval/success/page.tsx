
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Home } from 'lucide-react'
import Link from 'next/link'

export default async function SuccessPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
            <Card className="max-w-md w-full rounded-[3rem] border-emerald-100 bg-white shadow-2xl overflow-hidden text-center">
                <div className="bg-emerald-500 p-12 text-white flex justify-center">
                    <CheckCircle2 size={80} />
                </div>
                <CardContent className="p-12 space-y-6">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 mb-2">Bravo !</h1>
                        <p className="text-slate-500 font-medium leading-relaxed">
                            Votre auto-évaluation a été transmise avec succès à votre tuteur.
                        </p>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-sm text-slate-600 font-medium italic">
                        "Votre tuteur vient de recevoir une notification par email pour valider vos compétences."
                    </div>

                    <Link
                        href={`/apprentis/${token}`}
                        className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-slate-800 text-white h-16 rounded-2xl font-black text-lg transition-all"
                    >
                        <Home size={20} />
                        Retour à mon accueil
                    </Link>
                </CardContent>
            </Card>
        </div>
    )
}
