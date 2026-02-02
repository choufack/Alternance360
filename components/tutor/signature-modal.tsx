'use client'

import { useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PenTool, Loader2, Save } from 'lucide-react'
import { SignatureCanvas, type SignatureCanvasHandle } from '@/components/ui/signature-canvas'
import { uploadSignature } from '@/app/tutor/actions'
import { toast } from 'sonner'

export function SignatureModal() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const signatureRef = useRef<SignatureCanvasHandle>(null)

    const handleSave = async () => {
        const signatureData = signatureRef.current?.toDataURL()
        if (!signatureData || signatureData.length < 1000) {
            toast.error("Veuillez signer avant d'enregistrer")
            return
        }

        setLoading(true)
        try {
            const formData = new FormData()
            // Convert Base64 to Blob
            const response = await fetch(signatureData)
            const blob = await response.blob()
            const file = new File([blob], "signature.png", { type: "image/png" })
            formData.append('signature', file)

            const res = await uploadSignature(formData)

            if (res && !('error' in res)) {
                setOpen(false)
                toast.success("Bilan signé avec succès !")
            } else {
                toast.error("Impossible d'enregistrer la signature.")
            }
        } catch (error) {
            toast.error("Une erreur est survenue")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-6 rounded-2xl shadow-lg shadow-indigo-200 transition-all hover:scale-105 active:scale-95">
                    <PenTool className="mr-2 h-5 w-5" />
                    Signer le Bilan
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black text-slate-900 text-center">
                        Signature du Bilan
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {loading ? (
                        <div className="h-[200px] flex flex-col items-center justify-center text-indigo-600">
                            <Loader2 className="h-10 w-10 animate-spin mb-4" />
                            <p className="font-bold">Enregistrement...</p>
                        </div>
                    ) : (
                        <>
                            <SignatureCanvas ref={signatureRef} width={400} height={200} />
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => signatureRef.current?.clear()}
                                    className="flex-1 rounded-xl"
                                >
                                    Effacer
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    Enregistrer
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
