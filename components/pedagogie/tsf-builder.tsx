'use client'

import { useState, Fragment } from "react"
import { updateTSFCell, updateTSFDescription } from "@/app/actions/update-tsf"
import { updatePeriodDate, notifyStudentOfPeriod } from "@/app/actions/tsf"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, Building2, GraduationCap, Send, Calendar, Save, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import clsx from "clsx"
import { useRouter } from "next/navigation"

// Types matching our DB Data
type Period = { id: string; label: string; startDate: Date; endDate: Date }
type Competence = { id: string; description: string; bloc_title: string; indicateurs?: string[] }
type TSFMapping = {
    period_id: string
    competence_id: string
    flag_cfa: boolean
    flag_entreprise: boolean
    status: string
}

interface TSFGridProps {
    contractId: string
    periods: Period[]
    competences: Competence[] // flattened list
    initialMappings: TSFMapping[]
    isAdmin?: boolean
}

export function TSFGrid({ contractId, periods, competences, initialMappings, isAdmin = false }: TSFGridProps) {
    const [mappings, setMappings] = useState<TSFMapping[]>(initialMappings)
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const router = useRouter()

    // Helper to find mapping
    const getMapping = (compId: string, periodId: string) =>
        mappings.find(m => m.competence_id === compId && m.period_id === periodId)

    // Toggle Logic: None -> CFA -> ENT -> MIXTE -> None
    const handleToggle = async (compId: string, periodId: string) => {
        const key = `${compId}-${periodId}`
        if (loadingId === key) return
        setLoadingId(key)

        const current = getMapping(compId, periodId)
        let nextCFA = false
        let nextENT = false

        // State Machine
        if (!current || (!current.flag_cfa && !current.flag_entreprise)) {
            nextCFA = true // Blue
        } else if (current.flag_cfa && !current.flag_entreprise) {
            nextCFA = false; nextENT = true // Green
        } else if (!current.flag_cfa && current.flag_entreprise) {
            nextCFA = true; nextENT = true // Mixte
        } else {
            nextCFA = false; nextENT = false // Reset
        }

        // Optimistic Update
        const newMappings = [...mappings]
        const idx = newMappings.findIndex(m => m.competence_id === compId && m.period_id === periodId)
        if (idx >= 0) {
            newMappings[idx] = { ...newMappings[idx], flag_cfa: nextCFA, flag_entreprise: nextENT }
        } else {
            newMappings.push({
                competence_id: compId,
                period_id: periodId,
                flag_cfa: nextCFA,
                flag_entreprise: nextENT,
                status: 'PLANIFIE'
            })
        }
        setMappings(newMappings)

        // Server Persistence
        await updateTSFCell({
            contractId,
            competenceId: compId,
            periodId,
            flag_cfa: nextCFA,
            flag_entreprise: nextENT
        })

        setLoadingId(null)
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
        toast.success("Dates mises à jour (rechargez pour voir les changements)")
        router.refresh()
    }

    const handleDescriptionUpdate = async (competenceId: string, newDescription: string) => {
        const result = await updateTSFDescription(contractId, competenceId, newDescription)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Description personnalisée enregistrée !")
            router.refresh()
        }
    }

    // Group by Bloc
    const grouped = competences.reduce((acc, curr) => {
        if (!acc[curr.bloc_title]) acc[curr.bloc_title] = []
        acc[curr.bloc_title].push(curr)
        return acc
    }, {} as Record<string, Competence[]>)

    // Missing Check
    const getMissingCompetences = () => {
        return competences.filter(c => {
            const isAcquis = mappings.some(m => m.competence_id === c.id && m.status === 'ACQUIS')
            if (isAcquis) return false
            const hasFlag = mappings.some(m => m.competence_id === c.id && (m.flag_cfa || m.flag_entreprise))
            return !hasFlag
        })
    }

    const missing = getMissingCompetences()

    return (
        <div className="space-y-8">
            {/* Status Header */}
            <div className="flex items-center justify-between">
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider">
                        <GraduationCap size={14} />
                        CFA (École)
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider">
                        <Building2 size={14} />
                        Entreprise
                    </div>
                </div>

                {missing.length > 0 && (
                    <div className="flex items-center gap-2 text-rose-500 text-sm font-bold bg-rose-50 px-4 py-2 rounded-full">
                        <AlertCircle size={16} />
                        {missing.length} Compétences orphelines
                    </div>
                )}
            </div>

            <Card className="overflow-hidden border-none shadow-xl shadow-slate-200/40 rounded-[2rem]">
                <CardHeader className="bg-white border-b border-slate-100 p-8">
                    <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Grille de Progression TSF</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 text-slate-500">
                                    <th className="p-6 text-left border-b border-slate-100 font-bold uppercase tracking-widest text-[10px] w-1/3">
                                        Référentiel & Critères
                                    </th>
                                    {periods.map(p => (
                                        <th key={p.id} className="p-6 text-center border-b border-slate-100 min-w-[180px] align-top">
                                            <div className="flex flex-col items-center gap-2">
                                                <span className="font-bold uppercase tracking-widest text-[10px]">{p.label}</span>

                                                {isAdmin ? (
                                                    <div className="flex flex-col items-center gap-2 w-full">
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <button className="text-[10px] font-medium text-slate-400 hover:text-indigo-600 flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-100 shadow-sm">
                                                                    <Calendar size={10} />
                                                                    {new Date(p.startDate).toLocaleDateString()} - {new Date(p.endDate).toLocaleDateString()}
                                                                </button>
                                                            </DialogTrigger>
                                                            <DialogContent className="sm:max-w-[425px]">
                                                                <DialogHeader>
                                                                    <DialogTitle>Modifier les dates</DialogTitle>
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
                                                                            <Save size={14} className="mr-2" /> Enregistrer les modifications
                                                                        </Button>
                                                                    </DialogFooter>
                                                                </form>
                                                            </DialogContent>
                                                        </Dialog>

                                                        <Button
                                                            size="sm"
                                                            variant="primary"
                                                            className="h-7 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-slate-900 text-white hover:bg-indigo-600 w-full"
                                                            onClick={() => handleNotify(p.id)}
                                                        >
                                                            <Send size={10} className="mr-1" /> Notifier
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400">
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
                                        <tr key={bloc} className="bg-slate-50/30">
                                            <td colSpan={periods.length + 1} className="p-4 px-6 font-black text-slate-900 text-xs uppercase tracking-wide">
                                                {bloc}
                                            </td>
                                        </tr>
                                        {comps.map(comp => {
                                            const isAcquis = mappings.some(m => m.competence_id === comp.id && m.status === 'ACQUIS')
                                            return (
                                                <tr key={comp.id} className={clsx("group transition-colors", isAcquis ? "bg-emerald-50/30" : "hover:bg-slate-50")}>
                                                    <td className="p-6 border-r border-slate-50 bg-white group-hover:bg-slate-50 transition-colors">
                                                        <div className="font-bold text-slate-800 mb-2 leading-snug flex items-start justify-between gap-2">
                                                            <span>{comp.description}</span>

                                                            {isAdmin && (
                                                                <Dialog>
                                                                    <DialogTrigger asChild>
                                                                        <button className="text-slate-300 hover:text-indigo-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <Pencil size={14} />
                                                                        </button>
                                                                    </DialogTrigger>
                                                                    <DialogContent>
                                                                        <DialogHeader>
                                                                            <DialogTitle>Personnaliser le critère</DialogTitle>
                                                                        </DialogHeader>
                                                                        <form action={async (formData) => {
                                                                            await handleDescriptionUpdate(comp.id, formData.get('description') as string)
                                                                        }} className="space-y-4 py-4">
                                                                            <p className="text-sm text-slate-500">
                                                                                Modifiez le libellé de cette compétence pour le rendre plus compréhensible pour le tuteur. Ce changement n'affecte que cet alternant.
                                                                            </p>
                                                                            <Textarea
                                                                                name="description"
                                                                                defaultValue={comp.description}
                                                                                className="min-h-[100px]"
                                                                            />
                                                                            <DialogFooter>
                                                                                <Button type="submit">
                                                                                    <Save size={14} className="mr-2" /> Enregistrer
                                                                                </Button>
                                                                            </DialogFooter>
                                                                        </form>
                                                                    </DialogContent>
                                                                </Dialog>
                                                            )}

                                                            {isAcquis && <Badge className="ml-2 bg-emerald-100 text-emerald-700 border-none shadow-none">Acquis</Badge>}
                                                        </div>
                                                        {/* Indicators List */}
                                                        {comp.indicateurs && comp.indicateurs.length > 0 && (
                                                            <div className="pl-4 border-l-2 border-slate-100 space-y-1 mt-3">
                                                                {comp.indicateurs.map((ind, i) => (
                                                                    <div key={i} className="text-xs text-slate-500 font-medium flex items-start gap-2">
                                                                        <div className="w-1 h-1 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                                                                        {ind}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>
                                                    {periods.map(p => {
                                                        const m = getMapping(comp.id, p.id)
                                                        const loading = loadingId === `${comp.id}-${p.id}`

                                                        const isActive = m?.flag_cfa || m?.flag_entreprise

                                                        return (
                                                            <td key={p.id} className="p-4 text-center align-middle">
                                                                {isAcquis ? (
                                                                    <div className="flex justify-center text-emerald-400">
                                                                        <CheckCircle2 size={24} />
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleToggle(comp.id, p.id)}
                                                                        className={clsx(
                                                                            "relative w-full h-24 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 group/btn",
                                                                            !isActive && "border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white text-slate-300",
                                                                            m?.flag_cfa && !m?.flag_entreprise && "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-lg shadow-indigo-100",
                                                                            !m?.flag_cfa && m?.flag_entreprise && "bg-emerald-50 border-emerald-200 text-emerald-600 shadow-lg shadow-emerald-100",
                                                                            m?.flag_cfa && m?.flag_entreprise && "bg-gradient-to-br from-indigo-50 to-emerald-50 border-slate-200 text-slate-600 shadow-lg",
                                                                            loading && "opacity-50 cursor-wait scale-95"
                                                                        )}
                                                                    >
                                                                        {loading ? (
                                                                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                                        ) : (
                                                                            <>
                                                                                {/* Visual Status Indicators */}
                                                                                {m?.flag_cfa && (
                                                                                    <div className="absolute top-2 right-2 flex items-center gap-1">
                                                                                        <GraduationCap size={12} className={clsx(m.flag_entreprise ? "text-indigo-600" : "text-current")} />
                                                                                    </div>
                                                                                )}
                                                                                {m?.flag_entreprise && (
                                                                                    <div className="absolute bottom-2 right-2 flex items-center gap-1">
                                                                                        <Building2 size={12} className={clsx(m.flag_cfa ? "text-emerald-600" : "text-current")} />
                                                                                    </div>
                                                                                )}

                                                                                {/* Empty State Plus Icon */}
                                                                                {!isActive && (
                                                                                    <div className="text-2xl font-light opacity-0 group-hover/btn:opacity-100 transition-opacity">+</div>
                                                                                )}

                                                                                {/* Label for Mixed */}
                                                                                {m?.flag_cfa && m?.flag_entreprise && <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Mixte</span>}
                                                                                {/* Label for Single */}
                                                                                {m?.flag_cfa && !m?.flag_entreprise && <span className="text-[10px] font-black uppercase tracking-wider opacity-80">École</span>}
                                                                                {!m?.flag_cfa && m?.flag_entreprise && <span className="text-[10px] font-black uppercase tracking-wider opacity-80">Entr.</span>}
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </td>
                                                        )
                                                    })}
                                                </tr>
                                            )
                                        })}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
