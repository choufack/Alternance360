'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle2, Plus, Loader2 } from 'lucide-react'
import { addRemediationAction, completeRemediationAction, resolveRemediationPlan, type RemediationAction } from '@/app/actions/remediation'
import { toast } from 'sonner'

export function RemediationClient({ plan }: { plan: any }) {
    const [loading, setLoading] = useState(false)
    const [newAction, setNewAction] = useState('')
    const [dueDate, setDueDate] = useState('')

    const handleAddAction = async () => {
        if (!newAction || !dueDate) return
        setLoading(true)
        try {
            await addRemediationAction(plan.id, {
                title: newAction,
                dueDate,
                status: 'PENDING'
            })
            toast.success("Action ajoutée")
            setNewAction('')
            setDueDate('')
        } catch (e) {
            toast.error("Erreur lors de l'ajout")
        } finally {
            setLoading(false)
        }
    }

    const handleComplete = async (index: number) => {
        setLoading(true)
        try {
            await completeRemediationAction(plan.id, index)
            toast.success("Action marquée comme terminée")
        } catch (e) {
            toast.error("Erreur")
        } finally {
            setLoading(false)
        }
    }

    const handleResolve = async () => {
        setLoading(true)
        try {
            await resolveRemediationPlan(plan.id)
            toast.success("Plan clôturé avec succès")
        } catch (e) {
            toast.error("Erreur lors de la clôture")
        } finally {
            setLoading(false)
        }
    }

    const actions: RemediationAction[] = plan.actions

    const statusBadge = ({
        DRAFT: <Badge className="bg-slate-100 text-slate-700">Brouillon</Badge>,
        IN_PROGRESS: <Badge className="bg-blue-100 text-blue-700">En cours</Badge>,
        RESOLVED: <Badge className="bg-green-100 text-green-700">Résolu</Badge>
    } as Record<string, React.ReactNode>)[plan.status as string] || <Badge>Inconnu</Badge>

    return (
        <Card className="shadow-lg border-l-4 border-l-amber-400">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg">{plan.contract.user?.fullName}</CardTitle>
                        <p className="text-xs text-slate-500">{plan.contract.user?.email}</p>
                    </div>
                    {statusBadge}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="bg-amber-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-amber-900">Déclencheur</p>
                    <p className="text-sm text-amber-800">{plan.triggerReason}</p>
                </div>

                {/* Actions List */}
                {actions.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm font-bold text-slate-700">Actions correctives</p>
                        {actions.map((action, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                                <div className="flex items-center gap-2">
                                    {action.status === 'DONE' ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
                                    )}
                                    <span className={action.status === 'DONE' ? 'line-through text-slate-400' : ''}>
                                        {action.title}
                                    </span>
                                </div>
                                {action.status !== 'DONE' && (
                                    <Button size="sm" variant="ghost" onClick={() => handleComplete(idx)} disabled={loading}>
                                        Terminer
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Action Form */}
                {plan.status !== 'RESOLVED' && (
                    <div className="space-y-2 pt-2 border-t">
                        <p className="text-sm font-bold text-slate-700">Ajouter une action</p>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Description de l'action"
                                value={newAction}
                                onChange={(e) => setNewAction(e.target.value)}
                                className="flex-1"
                            />
                            <Input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-36"
                            />
                            <Button onClick={handleAddAction} disabled={loading || !newAction || !dueDate}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Resolve Button */}
                {plan.status === 'IN_PROGRESS' && actions.every((a: RemediationAction) => a.status === 'DONE') && (
                    <Button onClick={handleResolve} disabled={loading} className="w-full bg-green-600 hover:bg-green-700">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                        Clôturer le plan
                    </Button>
                )}
            </CardContent>
        </Card>
    )
}
