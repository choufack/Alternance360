'use client'

import { useState, useTransition } from 'react'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
} from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { toggleIndicator } from '@/app/actions/tsf'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, CheckCircle2 } from 'lucide-react'

// Types (should ideally be inferred from Prisma, but defining for UI clarity)
type Evaluation = {
    status: string
    checkedAt: Date | null
    validatorId: string | null
}

type Indicator = {
    id: string
    description: string
    evaluations: Evaluation[]
}

type Competence = {
    id: string
    description: string
    indicateurs: Indicator[]
}

type Block = {
    id: string
    title: string
    code?: string | null
    competences: Competence[]
}

type Props = {
    contractId: string
    initialData: {
        referentiel: {
            title: string
            codeRncp: string
            blocs: Block[]
        }
        progress: number
    }
}

export function TSFView({ contractId, initialData }: Props) {
    const [progress, setProgress] = useState(initialData.progress)
    const [optimisticEvaluations, setOptimisticEvaluations] = useState<Record<string, boolean>>({})
    const [isPending, startTransition] = useTransition()

    const { referentiel } = initialData

    // Calculates local progress including optimistic updates
    // (Simplification: Real progress recalc would require counting all indicators again)


    // Helper to calculate block progress client-side
    const getBlockStats = (bloc: Block) => {
        let total = 0
        let acquired = 0

        bloc.competences.forEach(comp => {
            comp.indicateurs.forEach(ind => {
                total++
                const serverStatus = ind.evaluations.some(e => e.status === "ACQUIS")
                const isChecked = optimisticEvaluations[ind.id] !== undefined
                    ? optimisticEvaluations[ind.id]
                    : serverStatus
                if (isChecked) acquired++
            })
        })

        const percent = total > 0 ? Math.round((acquired / total) * 100) : 0
        return { total, acquired, percent }
    }

    const handleToggle = (indicateurId: string, currentStatus: boolean) => {
        // Optimistic UI
        setOptimisticEvaluations(prev => ({ ...prev, [indicateurId]: !currentStatus }))

        startTransition(async () => {
            const result = await toggleIndicator(contractId, indicateurId, !currentStatus ? "ACQUIS" : "PENDING")
            if (result.error) {
                // Revert if error
                setOptimisticEvaluations(prev => ({ ...prev, [indicateurId]: currentStatus }))
                // Toast error here
            }
        })
    }

    return (
        <div className="space-y-6">
            {/* Header / KPI */}
            <Card className="bg-slate-50 border-slate-200">
                <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-xl text-slate-800">{referentiel.title}</CardTitle>
                            <CardDescription className="text-slate-500 font-mono text-xs mt-1">
                                {referentiel.codeRncp}
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-white text-slate-600">
                            {progress}% Progression Global
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <Progress value={progress} className="h-2" />
                </CardContent>
            </Card>

            {/* Blocks Accordion */}
            <Accordion type="single" collapsible className="w-full space-y-4">
                {referentiel.blocs.map((bloc, index) => {
                    const stats = getBlockStats(bloc)
                    const isFullyAcquired = stats.percent === 100

                    return (
                        <AccordionItem key={bloc.id} value={bloc.id} className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
                            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 transition-colors">
                                <div className="flex flex-col w-full gap-2 pr-4">
                                    <div className="flex justify-between items-center w-full">
                                        <div className="flex gap-3 text-left items-center">
                                            <span className="font-bold text-slate-400">#{index + 1}</span>
                                            <span className="font-semibold text-slate-700">{bloc.title}</span>
                                        </div>
                                        {isFullyAcquired && (
                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200">
                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                Bloc Validé
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 w-full max-w-sm">
                                        <Progress
                                            value={stats.percent}
                                            className={`h-1.5 ${stats.percent < 30 ? "bg-red-100 [&>div]:bg-red-500" : stats.percent < 70 ? "bg-orange-100 [&>div]:bg-orange-500" : "bg-emerald-100 [&>div]:bg-emerald-500"}`}
                                        />
                                        <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
                                            {stats.acquired}/{stats.total} ({stats.percent}%)
                                        </span>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="border-t border-slate-100">
                                <div className="p-4 space-y-6">
                                    {bloc.competences.map((comp) => (
                                        <div key={comp.id} className="space-y-3">
                                            <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${stats.percent === 100 ? "bg-emerald-500" : "bg-blue-500"}`}></div>
                                                {comp.description}
                                            </h4>
                                            <div className="pl-4 space-y-2">
                                                {comp.indicateurs.map((ind) => {
                                                    // Determine Checked State
                                                    const isAcquisServer = ind.evaluations.some(e => e.status === "ACQUIS")
                                                    const isChecked = optimisticEvaluations[ind.id] !== undefined
                                                        ? optimisticEvaluations[ind.id]
                                                        : isAcquisServer

                                                    return (
                                                        <div key={ind.id} className="flex items-start space-x-3 p-2 rounded-md hover:bg-slate-50 transition-colors">
                                                            <Checkbox
                                                                id={ind.id}
                                                                checked={isChecked}
                                                                onCheckedChange={() => handleToggle(ind.id, isChecked)}
                                                                className="mt-0.5 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                                            />
                                                            <label
                                                                htmlFor={ind.id}
                                                                className={`text-sm leading-tight cursor-pointer ${isChecked ? 'text-slate-500 line-through' : 'text-slate-600'}`}
                                                            >
                                                                {ind.description}
                                                            </label>
                                                            {isChecked && (
                                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-auto flex-shrink-0 animate-in fade-in zoom-in duration-200" />
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )
                })}
            </Accordion>
        </div>
    )
}
