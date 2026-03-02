'use client'

import { useState, useTransition } from 'react'
import { Bell, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { notifyStudent } from '@/app/actions/promotions'
import { toast } from 'sonner'

interface NotifyStudentButtonProps {
    contractId: string
    studentName: string
}

export function NotifyStudentButton({ contractId, studentName }: NotifyStudentButtonProps) {
    const [sent, setSent] = useState(false)
    const [isPending, startTransition] = useTransition()

    function handleNotify() {
        startTransition(async () => {
            const res = await notifyStudent(contractId)
            if (res.error) {
                toast.error(`Erreur : ${res.error}`)
            } else {
                setSent(true)
                toast.success(`Email envoyé à ${studentName} ! 📧`)
            }
        })
    }

    if (sent) {
        return (
            <Button size="sm" variant="outline" disabled className="gap-2 text-emerald-600 border-emerald-200 bg-emerald-50">
                <CheckCircle size={14} />
                Notifié
            </Button>
        )
    }

    return (
        <Button
            size="sm"
            variant="outline"
            onClick={handleNotify}
            disabled={isPending}
            className="gap-2 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all"
        >
            <Bell size={14} />
            {isPending ? 'Envoi...' : 'Notifier'}
        </Button>
    )
}
