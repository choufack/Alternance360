'use client'

import { useState } from 'react'
import { validateProof } from '@/app/actions/validate-proof'
import { FileText, Image as ImageIcon, ExternalLink, CheckCircle2, XCircle, MessageSquare, Loader2 } from 'lucide-react'

type Proof = {
    id: string
    createdAt: Date | string
    title: string
    url: string
    type: 'PDF' | 'PHOTO' | 'SIGNATURE'
    status: 'PENDING' | 'VALIDATED' | 'REJECTED'
    feedback?: string | null
    userId: string
    user?: {
        firstName: string | null
        lastName: string | null
    }
}

import { CommentThread } from '@/components/pedagogie/comment-thread'

export function ProofList({ proofs, currentUserId }: { proofs: Proof[], currentUserId: string }) {
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [feedback, setFeedback] = useState<string>('')
    const [selectedProof, setSelectedProof] = useState<string | null>(null)

    const handleValidation = async (id: string, status: 'VALIDATED' | 'REJECTED') => {
        setProcessingId(id)
        await validateProof(id, status, feedback)
        setProcessingId(null)
        setFeedback('')
        setSelectedProof(null)
    }

    if (proofs.length === 0) {
        return (
            <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                <CheckCircle2 className="mx-auto text-emerald-500 mb-4" size={48} />
                <p className="text-slate-500 font-bold text-lg">Tout est à jour !</p>
                <p className="text-slate-400">Aucune preuve en attente de validation.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {proofs.map((proof) => (
                <div key={proof.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">

                        {/* Info Preuve */}
                        <div className="flex items-start gap-4 flex-1">
                            <div className={`p-4 rounded-2xl ${proof.type === 'PDF' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                {proof.type === 'PDF' ? <FileText size={24} /> : <ImageIcon size={24} />}
                            </div>
                            <div className="w-full">
                                <h3 className="font-bold text-slate-900 text-lg">{proof.title}</h3>
                                <p className="text-slate-500 text-sm font-medium mt-1">
                                    Par <span className="text-indigo-600">{proof.user?.firstName} {proof.user?.lastName}</span> • Le {new Date(proof.createdAt).toLocaleDateString('fr-FR')}
                                </p>
                                <a
                                    href={proof.url}
                                    target="_blank"
                                    className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 mt-2 transition-colors"
                                >
                                    <ExternalLink size={14} />
                                    Voir le document
                                </a>

                                {/* Integrated Comments */}
                                <CommentThread proofId={proof.id} currentUserId={currentUserId} />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col items-end gap-3 min-w-[200px]">
                            {selectedProof === proof.id ? (
                                <div className="w-full space-y-3 animate-in fade-in slide-in-from-right-2">
                                    <textarea
                                        placeholder="Ajouter un commentaire (optionnel)..."
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        rows={2}
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleValidation(proof.id, 'VALIDATED')}
                                            disabled={!!processingId}
                                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                        >
                                            {processingId === proof.id ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                                            Valider
                                        </button>
                                        <button
                                            onClick={() => handleValidation(proof.id, 'REJECTED')}
                                            disabled={!!processingId}
                                            className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-2 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                        >
                                            {processingId === proof.id ? <Loader2 className="animate-spin" size={16} /> : <XCircle size={16} />}
                                            Refuser
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setSelectedProof(null)}
                                        className="text-xs text-slate-400 hover:text-slate-600 font-medium w-full text-center"
                                    >
                                        Annuler
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setSelectedProof(proof.id)}
                                    className="bg-slate-900 hover:bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-slate-200 active:scale-95 flex items-center gap-2"
                                >
                                    <MessageSquare size={16} />
                                    Examiner
                                </button>
                            )}
                        </div>

                    </div>
                </div>
            ))}
        </div>
    )
}
