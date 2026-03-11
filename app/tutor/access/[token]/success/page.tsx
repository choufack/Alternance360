import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Home } from 'lucide-react'
import Link from 'next/link'

export default function TutorSuccessPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full rounded-[3rem] border-none shadow-2xl bg-white overflow-hidden">
                <CardContent className="p-12 text-center space-y-8">
                    <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner shadow-emerald-100/50">
                        <CheckCircle2 size={48} strokeWidth={2.5} />
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Validation enregistrée !</h1>
                        <p className="text-slate-500 font-medium leading-relaxed">
                            Merci d'avoir complété l'évaluation. Vos retours ont été transmis au CFA et sont désormais consultables par l'apprenti.
                        </p>
                    </div>

                    <div className="pt-4">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-black transition-all shadow-xl shadow-slate-200"
                        >
                            <Home size={18} />
                            Retour à l'accueil
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
