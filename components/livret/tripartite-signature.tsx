'use client'

import { useState, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2, PenTool, User, Building2, GraduationCap } from 'lucide-react'
import { signAsApprentice, signAsTutor, signAsCFA } from '@/app/actions/signature'
import { toast } from 'sonner'
import { SignatureCanvas, type SignatureCanvasHandle } from '@/components/ui/signature-canvas'

type SignatureParty = {
    name: string
    signedAt: Date | null
}

type SignatureStatus = {
    apprentice: SignatureParty
    tutor: SignatureParty
    cfa: SignatureParty
    isFullySigned: boolean
    status: string
}

type Props = {
    livretId: string
    status: SignatureStatus
    userRole: 'apprentice' | 'tutor' | 'admin'
    magicToken?: string
}

export function TripartiteSignature({ livretId, status, userRole, magicToken }: Props) {
    const [loading, setLoading] = useState(false)
    const [localStatus, setLocalStatus] = useState(status)
    const signatureRef = useRef<SignatureCanvasHandle>(null)

    const handleSign = async () => {
        if (!signatureRef.current) return

        const signatureData = signatureRef.current.toDataURL()
        if (!signatureData || signatureData.length < 1000) {
            toast.error("Veuillez signer dans le cadre ci-dessous")
            return
        }

        setLoading(true)
        try {
            if (userRole === 'apprentice') {
                await signAsApprentice(livretId, signatureData)
                setLocalStatus(prev => ({
                    ...prev,
                    apprentice: { ...prev.apprentice, signedAt: new Date() }
                }))
            } else if (userRole === 'tutor') {
                await signAsTutor(livretId, signatureData, magicToken)
                setLocalStatus(prev => ({
                    ...prev,
                    tutor: { ...prev.tutor, signedAt: new Date() }
                }))
            } else if (userRole === 'admin') {
                await signAsCFA(livretId, signatureData)
                setLocalStatus(prev => ({
                    ...prev,
                    cfa: { ...prev.cfa, signedAt: new Date() }
                }))
            }
            toast.success("Signature enregistrée avec succès !")
        } catch (e: any) {
            toast.error(e.message || "Erreur lors de la signature")
        } finally {
            setLoading(false)
        }
    }

    const parties = [
        { key: 'apprentice', label: 'Apprenti', icon: GraduationCap, data: localStatus.apprentice },
        { key: 'tutor', label: 'Tuteur Entreprise', icon: Building2, data: localStatus.tutor },
        { key: 'cfa', label: 'CFA', icon: User, data: localStatus.cfa }
    ]

    const canSign = (key: string) => {
        if (key === 'apprentice' && userRole === 'apprentice' && !localStatus.apprentice.signedAt) return true
        if (key === 'tutor' && userRole === 'tutor' && !localStatus.tutor.signedAt) return true
        if (key === 'cfa' && userRole === 'admin' && !localStatus.cfa.signedAt) return true
        return false
    }

    const isFullySigned = localStatus.apprentice.signedAt && localStatus.tutor.signedAt && localStatus.cfa.signedAt

    return (
        <Card className="shadow-xl border-l-4 border-l-indigo-500">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <PenTool className="h-5 w-5 text-indigo-600" />
                    Signature Tripartite
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Status Overview */}
                <div className="grid grid-cols-3 gap-4">
                    {parties.map(party => (
                        <div
                            key={party.key}
                            className={`p-4 rounded-lg text-center ${party.data.signedAt ? 'bg-green-50 border border-green-200' : 'bg-slate-50 border border-slate-200'}`}
                        >
                            <party.icon className={`h-8 w-8 mx-auto mb-2 ${party.data.signedAt ? 'text-green-600' : 'text-slate-400'}`} />
                            <p className="font-semibold text-sm">{party.label}</p>
                            <p className="text-xs text-slate-500">{party.data.name}</p>
                            {party.data.signedAt ? (
                                <div className="mt-2 flex items-center justify-center gap-1 text-green-600 text-xs">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Signé
                                </div>
                            ) : (
                                <p className="mt-2 text-xs text-amber-600">En attente</p>
                            )}
                        </div>
                    ))}
                </div>

                {/* Signature Area */}
                {!isFullySigned && parties.some(p => canSign(p.key)) && (
                    <div className="space-y-4 pt-4 border-t">
                        <p className="text-sm font-medium text-slate-700">Votre Signature</p>
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-2 bg-white">
                            <SignatureCanvas ref={signatureRef} width={400} height={150} />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => signatureRef.current?.clear()}
                                disabled={loading}
                            >
                                Effacer
                            </Button>
                            <Button
                                onClick={handleSign}
                                disabled={loading}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PenTool className="h-4 w-4 mr-2" />}
                                Signer le Livret
                            </Button>
                        </div>
                    </div>
                )}

                {/* Fully Signed Message */}
                {isFullySigned && (
                    <div className="bg-green-50 p-4 rounded-lg text-center">
                        <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto mb-2" />
                        <p className="font-bold text-green-800">Livret Signé par toutes les parties</p>
                        <p className="text-sm text-green-600">Le document est maintenant validé et archivé.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
