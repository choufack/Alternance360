import { ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { signOut } from '@/auth'

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-8">
                <ShieldAlert size={48} />
            </div>
            <h1 className="text-4xl font-black text-slate-900 mb-4">Accès Refusé</h1>
            <p className="text-lg text-slate-500 mb-10 max-w-md mx-auto">
                Vous n'avez pas les droits nécessaires pour accéder à cet espace. Veuillez contacter votre administrateur CFA.
            </p>
            <div className="flex gap-4">
                <Link href="/" className="px-8 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all">
                    Accueil
                </Link>
                <form action={async () => {
                    'use server'
                    await signOut({ redirectTo: '/login' })
                }}>
                    <button type="submit" className="px-8 py-3 bg-blue-900 text-white rounded-xl font-bold hover:bg-blue-800 transition-all shadow-lg shadow-blue-900/10">
                        Se déconnecter et réessayer
                    </button>
                </form>
            </div>
        </div>
    )
}
