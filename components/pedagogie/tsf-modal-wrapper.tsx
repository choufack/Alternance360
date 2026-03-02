'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useRouter, usePathname } from "next/navigation"
import { X } from "lucide-react"

interface TSFModalWrapperProps {
    children: React.ReactNode
    studentName: string
}

export function TSFModalWrapper({ children, studentName }: TSFModalWrapperProps) {
    const router = useRouter()
    const pathname = usePathname()

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            router.push(pathname)
        }
    }

    return (
        <Dialog defaultOpen={true} onOpenChange={handleOpenChange}>
            <DialogContent className="w-screen h-screen max-w-none m-0 rounded-none flex flex-col p-0 gap-0 [&>button]:hidden" aria-describedby="tsf-modal-description">
                <DialogHeader className="px-8 py-5 border-b flex flex-row items-center justify-between">
                    <div>
                        <DialogTitle className="text-xl font-black">
                            TSF — {studentName}
                        </DialogTitle>
                        <DialogDescription id="tsf-modal-description" className="text-slate-500 text-sm mt-0.5">
                            Édition du parcours de formation
                        </DialogDescription>
                    </div>
                    {/* Visible close button */}
                    <button
                        onClick={() => router.push(pathname)}
                        className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all border border-slate-200 hover:border-rose-200 focus:outline-none"
                        aria-label="Fermer"
                    >
                        <X size={22} strokeWidth={2.5} />
                    </button>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                    {children}
                </div>
            </DialogContent>
        </Dialog>
    )
}
