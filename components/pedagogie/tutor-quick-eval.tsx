"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Clock, EyeOff, User, Calendar, MessageSquare, ChevronRight, GraduationCap } from "lucide-react"
import { SignaturePad } from "./signature-pad"

interface TutorEvalProps {
    apprenticeName: string
    activities: {
        id: string
        date: string
        titre: string
        description: string
        reflexion_appris: string
        competenceIds: string[]
    }[]
    competences: { id: string, description: string, items?: { id: string, label: string }[] }[]
}

export function TutorQuickEval({ apprenticeName, activities, competences }: TutorEvalProps) {
    const [selectedActivity, setSelectedActivity] = useState<string | null>(null)
    const [evals, setEvals] = useState<Record<string, 'ACQUIS' | 'EN_COURS' | 'NON_VU'>>({})

    const handleToggleEval = (compId: string, status: 'ACQUIS' | 'EN_COURS' | 'NON_VU') => {
        setEvals(prev => ({ ...prev, [compId]: status }))
    }

    return (
        <div className="space-y-8 bg-gray-50 min-h-screen pb-20">
            {/* Header Mobile-Friendly */}
            <div className="bg-white p-6 shadow-sm border-b">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <User className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 leading-tight tracking-tight">{apprenticeName}</h2>
                        <p className="text-xs text-blue-600 font-bold uppercase tracking-widest">Suivi Période Actuelle</p>
                    </div>
                </div>
            </div>

            <div className="px-6 space-y-6">
                {/* 1. Recentes saisies du Journal */}
                <section className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-gray-400 tracking-[0.2em] flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Activités Récentes
                    </h3>
                    <div className="space-y-3">
                        {activities.map(act => (
                            <Card
                                key={act.id}
                                className={`border-none shadow-sm transition-all cursor-pointer ${selectedActivity === act.id ? 'ring-2 ring-blue-500' : ''}`}
                                onClick={() => setSelectedActivity(act.id === selectedActivity ? null : act.id)}
                            >
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 flex flex-col items-center justify-center min-w-[40px] border-r pr-3 border-gray-100">
                                            <span className="text-lg font-black text-gray-900 tracking-tighter">{act.date.split('-')[2]}</span>
                                            <span className="text-[10px] uppercase font-bold text-gray-400">Juin</span>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="font-bold text-gray-900 leading-tight">{act.titre}</p>
                                            <p className="text-xs text-gray-500 line-clamp-1">{act.description}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform ${selectedActivity === act.id ? 'rotate-90' : ''}`} />
                                </CardContent>
                                {selectedActivity === act.id && (
                                    <div className="px-4 pb-4 border-t pt-4 bg-gray-50/30 rounded-b-xl space-y-3">
                                        <p className="text-xs text-gray-600 font-medium bg-white p-3 rounded-lg border border-gray-100">
                                            <span className="font-black text-blue-600 uppercase mr-1">Ressenti :</span>
                                            {act.reflexion_appris}
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {act.competenceIds.map(cid => (
                                                <Badge key={cid} variant="secondary" className="text-[8px] uppercase bg-white border border-gray-200">
                                                    CP_{cid.substring(0, 4)}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                </section>

                {/* 2. Quick Assessment Grid */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase text-gray-400 tracking-[0.2em] flex items-center gap-2">
                            <GraduationCap className="w-4 h-4" /> Évaluation Rapide
                        </h3>
                        <Badge className="bg-blue-600 font-bold uppercase text-[9px]">Période 2</Badge>
                    </div>

                    <div className="space-y-3">
                        {competences.map(c => (
                            <Card key={c.id} className="border-none shadow-sm overflow-hidden">
                                <div className="p-4 bg-white">
                                    <p className="text-sm font-bold text-gray-800 leading-snug mb-4">{c.description}</p>

                                    {/* Sub-criteria Checklist */}
                                    {c.items && c.items.length > 0 && (
                                        <div className="mb-4 pl-2 space-y-2 border-l-2 border-slate-100">
                                            {c.items.map(item => (
                                                <div key={item.id} className="flex items-start gap-2">
                                                    <input
                                                        type="checkbox"
                                                        id={`item-${item.id}`}
                                                        className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <label htmlFor={`item-${item.id}`} className="text-xs text-slate-600 leading-tight">
                                                        {item.label}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            onClick={() => handleToggleEval(c.id, 'ACQUIS')}
                                            className={`
                                                flex flex-col items-center justify-center p-2 rounded-xl border transition-all
                                                ${evals[c.id] === 'ACQUIS' ? 'bg-green-600 border-green-600 text-white' : 'bg-gray-50 border-gray-100 text-gray-400'}
                                            `}
                                        >
                                            <Check className="w-4 h-4 mb-1" />
                                            <span className="text-[8px] font-black uppercase">Acquis</span>
                                        </button>
                                        <button
                                            onClick={() => handleToggleEval(c.id, 'EN_COURS')}
                                            className={`
                                                flex flex-col items-center justify-center p-2 rounded-xl border transition-all
                                                ${evals[c.id] === 'EN_COURS' ? 'bg-orange-500 border-orange-500 text-white' : 'bg-gray-50 border-gray-100 text-gray-400'}
                                            `}
                                        >
                                            <Clock className="w-4 h-4 mb-1" />
                                            <span className="text-[8px] font-black uppercase">En cours</span>
                                        </button>
                                        <button
                                            onClick={() => handleToggleEval(c.id, 'NON_VU')}
                                            className={`
                                                flex flex-col items-center justify-center p-2 rounded-xl border transition-all
                                                ${evals[c.id] === 'NON_VU' ? 'bg-gray-400 border-gray-400 text-white' : 'bg-gray-50 border-gray-100 text-gray-400'}
                                            `}
                                        >
                                            <EyeOff className="w-4 h-4 mb-1" />
                                            <span className="text-[8px] font-black uppercase">Non vu</span>
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* 3. Monthly Bilan / Signature */}
                <section className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-gray-400 tracking-[0.2em] flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Bilan Mensuel
                    </h3>
                    <div className="space-y-4">
                        <textarea
                            className="w-full p-4 bg-white border-none rounded-2xl shadow-sm text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                            placeholder="Vos commentaires sur le mois écoulé, l'assiduité, les progrès..."
                        />
                        <SignaturePad onSave={(data) => console.log("Signature saved", data)} />
                    </div>
                </section>
            </div>
        </div>
    )
}
