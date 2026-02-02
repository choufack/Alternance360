'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useRouter, usePathname } from "next/navigation"

interface TSFModalWrapperProps {
    children: React.ReactNode
    studentName: string
}

export function TSFModalWrapper({ children, studentName }: TSFModalWrapperProps) {
    const router = useRouter()
    const pathname = usePathname()

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            // Close: remove query params by pushing just the pathname
            router.push(pathname)
        }
    }

    return (
        <Dialog defaultOpen={true} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0" aria-describedby="tsf-modal-description">
                <DialogHeader className="px-8 py-6 border-b">
                    <DialogTitle>
                        TSF - {studentName}
                    </DialogTitle>
                    <DialogDescription id="tsf-modal-description">
                        Édition du parcours de formation
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                    {children}
                </div>
            </DialogContent>
        </Dialog>
    )
}
