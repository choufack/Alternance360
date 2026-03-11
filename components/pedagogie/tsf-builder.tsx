'use client'

import { useState, Fragment } from "react"
import { updateTSFStatusAndComment, updateTSFDescription } from "@/app/actions/update-tsf"
import { updatePeriodDate, notifyStudentOfPeriod } from "@/app/actions/tsf"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, Send, Calendar, Save, Pencil, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import clsx from "clsx"
import { useRouter } from "next/navigation"

type Period = { id: string; label: string; startDate: Date; endDate: Date }
type Competence = { id: string; description: string; bloc_title: string; indicateurs?: string[] }
type TSFMapping = {
    period_id: string
    competence_id: string
    flag_cfa: boolean
    flag_entreprise: boolean
    status: string
    comment?: string | null
}

interface TSFGridProps {
    contractId: string
    periods: Period[]
    competences: Competence[]
    initialMappings: TSFMapping[]
    isAdmin?: boolean
    token?: string
}

const statusColors: Record<string, string> = {
    PENDING: "bg-slate-100 text-slate-600 border-slate-200",
    EN_COURS: "bg-amber-100 text-amber-700 border-amber-200",
    ACQUIS: "bg-emerald-100 text-emerald-700 border-emerald-200",
    NON_ACQUIS: "bg-rose-100 text-rose-700 border-rose-200"
}

const statusLabels: Record<string, string> = {
    PENDING: "À évaluer",
    EN_COURS: "En cours",
    ACQUIS: "Acquis",
    NON_ACQUIS: "Non acquis"
}

export function TSFGrid({ contractId, periods, competences, initialMappings, isAdmin = false, token }: TSFGridProps) {
    const [mappings, setMappings] = useState<TSFMapping[]>(initialMappings)
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({})
    const router = useRouter()

    const getMapping = (compId: string, periodId: string) =>
        mappings.find(m => m.competence_id === compId && m.period_id === periodId)

    const handleStatusUpdate = async (compId: string, periodId: string, status: string, comment?: string) => {
        const key = `${compId}-${periodId}`
        setLoadingMap(prev => ({ ...prev, [key]: true }))

        // Optimistic
        const newMappings = [...mappings]
        const idx = newMappings.findIndex(m => m.competence_id === compId && m.period_id === periodId)
        if (idx >= 0) {
            newMappings[idx] = { ...newMappings[idx], status, comment: comment !== undefined ? comment : newMappings[idx].comment }
        }
        setMappings(newMappings)

        const res = await updateTSFStatusAndComment({
            contractId,
            competenceId: compId,
            periodId,
            status,
            comment,
            token
        })

        if (!res.success) {
            toast.error("Erreur : " + res.error)
            // Revert on error (could fetch fresh data)
            setMappings(initialMappings)
        } else {
            toast.success("Mise à jour enregistrée")
            router.refresh()
        }

        setLoadingMap(prev => ({ ...prev, [key]: false }))
    }

    const handleNotify = async (periodId: string) => {
        toast.promise(notifyStudentOfPeriod(periodId), {
            loading: 'Envoi de la notification...',
            success: 'Étudiant notifié avec succès !',
            error: "Erreur lors de l'envoi"
        })
    }

    const handleDateUpdate = async (periodId: string, start: string, end: string) => {
        await updatePeriodDate(periodId, new Date(start), new Date(end))
        toast.success("Dates mises à jour !")
        router.refresh()
    }

    const handleDescriptionUpdate = async (competenceId: string, newDescription: string) => {
        const result = await updateTSFDescription(contractId, competenceId, newDescription, token)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Description enregistrée !")
            router.refresh()
        }
    }

    // Only keep mapped competences for clean display
    const mappedCompetences = competences.filter(c => mappings.some(m => m.competence_id === c.id))

    const grouped = mappedCompetences.reduce((acc, curr) => {
        if (!acc[curr.bloc_title]) acc[curr.bloc_title] = []
        acc[curr.bloc_title].push(curr)
        return acc
    }, {} as Record<string, Competence[]>)

    const missingCount = competences.length - mappedCompetences.length

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Progression Pédagogique (TSF)</h2>
                    <p className="text-slate-500 font-medium">Suivi détaillé des Unités de Compétences Professionnelles planifiées.</p>
                </div>

                {missingCount > 0 && (
                    <div className="flex items-center gap-2 text-amber-600 text-sm font-bold bg-amber-50 border border-amber-200 px-4 py-2 rounded-full">
                        <AlertCircle size={16} />
                        {missingCount} compétences non évaluées sur ce contrat
                    </div>
                )}
            </div>

            <Card className="overflow-hidden border-none shadow-xl shadow-slate-200/40 rounded-[2rem] bg-white">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400">
                                    <th className="p-6 text-left font-black uppercase tracking-widest text-[11px] w-[35%]">
                                        Bloc & Compétence Évaluée
                                    </th>
                                    {periods.map(p => (
                                        <th key={p.id} className="p-6 text-center border-l border-slate-100 min-w-[220px] align-top bg-white/50">
                                            <div className="flex flex-col items-center gap-2">
                                                <span className="font-black text-slate-900 uppercase tracking-widest text-[12px]">{p.label}</span>

                                                {isAdmin ? (
                                                    <div className="flex flex-col items-center gap-2 w-full mt-2">
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <button className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors w-full">
                                                                    <Calendar size={12} />
                                                                    {new Date(p.startDate).toLocaleDateString()} - {new Date(p.endDate).toLocaleDateString()}
                                                                </button>
                                                            </DialogTrigger>
                                                            <DialogContent className="sm:max-w-[425px]">
                                                                <DialogHeader>
                                                                    <DialogTitle>Modifier les dates d'évaluation</DialogTitle>
                                                                </DialogHeader>
                                                                <form action={async (formData) => {
                                                                    await handleDateUpdate(p.id, formData.get('start') as string, formData.get('end') as string)
                                                                }} className="space-y-4 py-4">
                                                                    <div className="grid gap-2">
                                                                        <label className="text-sm font-bold">Date de début</label>
                                                                        <Input name="start" type="date" defaultValue={new Date(p.startDate).toISOString().split('T')[0]} />
                                                                    </div>
                                                                    <div className="grid gap-2">
                                                                        <label className="text-sm font-bold">Date de fin</label>
                                                                        <Input name="end" type="date" defaultValue={new Date(p.endDate).toISOString().split('T')[0]} />
                                                                    </div>
                                                                    <DialogFooter>
                                                                        <Button type="submit">
                                                                            <Save size={14} className="mr-2" /> Enregistrer les dates
                                                                        </Button>
                                                                    </DialogFooter>
                                                                </form>
                                                            </DialogContent>
                                                        </Dialog>

                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 text-[11px] font-bold uppercase tracking-wider rounded-lg text-slate-600 border-slate-200 hover:bg-slate-900 hover:text-white hover:border-slate-900 w-full transition-all"
                                                            onClick={() => handleNotify(p.id)}
                                                        >
                                                            <Send size={12} className="mr-1.5" /> Notifier apprenti
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] font-medium text-slate-400 mt-1">
                                                        {new Date(p.startDate).toLocaleDateString()} - {new Date(p.endDate).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {Object.entries(grouped).map(([bloc, comps]) => (
                                    <Fragment key={bloc}>
                                        <tr key={bloc} className="bg-slate-50/80">
                                            <td colSpan={periods.length + 1} className="p-4 px-6 font-black text-slate-700 text-xs uppercase tracking-wider">
                                                {bloc}
                                            </td>
                                        </tr>
                                        {comps.map(comp => (
                                            <tr key={comp.id} className="group hover:bg-slate-50/40 transition-colors">
                                                <td className="p-6 bg-white group-hover:bg-slate-50/40 transition-colors">
                                                    <div className="font-bold text-slate-800 mb-2 leading-relaxed flex items-start justify-between gap-3">
                                                        <span className="flex-1">{comp.description}</span>

                                                        {isAdmin && (
                                                            <Dialog>
                                                                <DialogTrigger asChild>
                                                                    <button className="text-slate-300 hover:text-indigo-600 p-1.5 bg-slate-50 hover:bg-indigo-50 rounded-md opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                                                        <Pencil size={14} />
                                                                    </button>
                                                                </DialogTrigger>
                                                                <DialogContent>
                                                                    <DialogHeader>
                                                                        <DialogTitle>Personnaliser l'UCP</DialogTitle>
                                                                    </DialogHeader>
                                                                    <form action={async (formData) => {
                                                                        await handleDescriptionUpdate(comp.id, formData.get('description') as string)
                                                                    }} className="space-y-4 py-4">
                                                                        <p className="text-sm text-slate-500">
                                                                            Modifiez le libellé de cette compétence pour la rendre plus lisible par l'apprenti et le tuteur. (Modifie uniquement ce contrat).
                                                                        </p>
                                                                        <Textarea name="description" defaultValue={comp.description} className="min-h-[120px]" />
                                                                        <DialogFooter>
                                                                            <Button type="submit"><Save size={14} className="mr-2" /> Mettre à jour</Button>
                                                                        </DialogFooter>
                                                                    </form>
                                                                </DialogContent>
                                                            </Dialog>
                                                        )}
                                                    </div>

                                                    {comp.indicateurs && comp.indicateurs.length > 0 && (
                                                        <div className="pl-4 border-l-2 border-slate-100 space-y-1.5 mt-3">
                                                            {comp.indicateurs.map((ind, i) => (
                                                                <div key={i} className="text-xs text-slate-500 font-medium flex items-start gap-2 leading-relaxed">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                                                                    {ind}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                {periods.map(p => {
                                                    const m = getMapping(comp.id, p.id)
                                                    const isLoading = loadingMap[`${comp.id}-${p.id}`]

                                                    if (!m) {
                                                        // This UCP is not evaluated in this Period
                                                        return (
                                                            <td key={p.id} className="p-4 text-center border-l border-slate-50 bg-slate-50/20 align-middle">
                                                                <span className="text-slate-300 italic text-xs">Non évalué</span>
                                                            </td>
                                                        )
                                                    }

                                                    // Safely grab status formatting
                                                    const mappedStatus = m.status || 'PENDING'
                                                    const statusClass = statusColors[mappedStatus] || statusColors.PENDING
                                                    const statusLabel = statusLabels[mappedStatus] || mappedStatus

                                                    return (
                                                        <td key={p.id} className="p-4 text-center border-l border-slate-100 align-middle">
                                                            <div className={clsx("flex flex-col items-stretch gap-3 w-full bg-white p-4 rounded-xl shadow-sm border border-slate-100 transition-opacity", isLoading && "opacity-50 pointer-events-none")}>
                                                                {isAdmin ? (
                                                                    <>
                                                                        <Select
                                                                            value={mappedStatus}
                                                                            onValueChange={(val) => handleStatusUpdate(comp.id, p.id, val, m.comment || '')}
                                                                        >
                                                                            <SelectTrigger className={clsx("h-9 border text-xs font-bold", statusClass)}>
                                                                                <SelectValue placeholder="Sélectionner..." />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="PENDING" className="text-slate-600 font-medium">À évaluer</SelectItem>
                                                                                <SelectItem value="EN_COURS" className="text-amber-600 font-medium">En cours</SelectItem>
                                                                                <SelectItem value="ACQUIS" className="text-emerald-600 font-medium">Acquis</SelectItem>
                                                                                <SelectItem value="NON_ACQUIS" className="text-rose-600 font-medium">Non acquis</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>

                                                                        <Dialog>
                                                                            <DialogTrigger asChild>
                                                                                <Button variant="ghost" size="sm" className={clsx("h-8 text-xs font-bold justify-start px-2", m.comment ? "text-indigo-600 bg-indigo-50 hover:bg-indigo-100" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100")}>
                                                                                    <MessageSquare size={14} className="mr-2" />
                                                                                    {m.comment ? "Voir / Éditer note" : "Ajouter une note"}
                                                                                </Button>
                                                                            </DialogTrigger>
                                                                            <DialogContent>
                                                                                <DialogHeader>
                                                                                    <DialogTitle>Observation du CFA</DialogTitle>
                                                                                </DialogHeader>
                                                                                <form action={async (formData) => {
                                                                                    await handleStatusUpdate(comp.id, p.id, mappedStatus, formData.get('comment') as string)
                                                                                }} className="space-y-4 py-4">
                                                                                    <Textarea
                                                                                        name="comment"
                                                                                        defaultValue={m.comment || ''}
                                                                                        placeholder="Saisissez une observation concernant cette évaluation..."
                                                                                        className="min-h-[120px]"
                                                                                    />
                                                                                    <DialogFooter>
                                                                                        <Button type="submit"><Save size={14} className="mr-2" /> Enregistrer la note</Button>
                                                                                    </DialogFooter>
                                                                                </form>
                                                                            </DialogContent>
                                                                        </Dialog>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Badge className={clsx("justify-center text-xs py-1 text-center font-bold w-full uppercase tracking-wider", statusClass)}>
                                                                            {statusLabel}
                                                                        </Badge>
                                                                        {m.comment && (
                                                                            <div className="bg-slate-50 text-slate-600 p-3 rounded-lg text-left text-xs italic border border-slate-100">
                                                                                {m.comment}
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))}
                                    </Fragment>
                                ))}
                                {mappedCompetences.length === 0 && (
                                    <tr>
                                        <td colSpan={periods.length + 1} className="p-16 text-center text-slate-400 font-medium">
                                            Aucune compétence n'est planifiée dans le bilan éducatif partagé actuel.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
