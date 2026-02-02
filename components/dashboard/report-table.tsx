"use client"

import { useState } from "react"
import { BlockReport, ProgressReport } from "@/app/actions/report-generator"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Printer, ShieldCheck, MapPin, Download, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function ReportTable({ data }: { data: ProgressReport }) {
    const [isGenerating, setIsGenerating] = useState(false)

    // Status Badge Helper
    const StatusBadge = ({ status }: { status: BlockReport['status'] }) => {
        switch (status) {
            case 'VALIDATED':
                return <Badge className="bg-slate-800 text-white hover:bg-slate-900">Validé</Badge>
            case 'IN_PROGRESS':
                return <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">En cours</Badge>
            default:
                return <Badge variant="outline" className="text-slate-400 border-slate-200">Non démarré</Badge>
        }
    }

    const handleDownloadOfficialLivret = async () => {
        try {
            setIsGenerating(true)
            const response = await fetch('/api/livret/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contractId: data.contractId })
            })

            const result = await response.json()

            if (result.success && result.downloadUrl) {
                // Trigger download
                const link = document.createElement('a')
                link.href = result.downloadUrl
                link.download = `livret-${result.documentId}.pdf`
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                toast.success("Livret généré et téléchargé avec succès")
            } else {
                throw new Error(result.error || "Erreur lors de la génération")
            }
        } catch (error) {
            console.error("Download error:", error)
            toast.error("Impossible de générer le livret officiel")
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div className="w-full max-w-5xl mx-auto bg-white p-8 print:p-0">
            {/* Header for Screen Only */}
            <div className="flex justify-between items-center mb-8 print:hidden">
                <h2 className="text-2xl font-bold text-slate-900">Rapport de Progression</h2>
                <div className="flex gap-3">
                    <button
                        onClick={handleDownloadOfficialLivret}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors"
                    >
                        {isGenerating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        Livret Officiel PDF
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
                    >
                        <Printer className="w-4 h-4" />
                        Imprimer Bilan
                    </button>
                </div>
            </div>

            {/* Document Header */}
            <header className="mb-12 border-b-2 border-slate-900 pb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 uppercase tracking-tight">Bilan de Compétences</h1>
                    <p className="text-slate-500 mt-2 text-lg">{data.referentielTitle}</p>
                </div>
                <div className="text-right">
                    <p className="font-bold text-slate-900 text-xl">{data.apprenticeName}</p>
                    <p className="text-slate-500 text-sm">Contrat #{data.contractId.slice(0, 8)}</p>
                    <p className="text-slate-400 text-xs mt-1">Généré le {data.generatedAt.toLocaleDateString()}</p>
                </div>
            </header>

            {/* Main Table */}
            <div className="border border-slate-200 rounded-sm overflow-hidden mb-8">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-xs tracking-wider border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 w-1/3">Bloc de Compétences</th>
                            <th className="px-6 py-4 w-1/4">Progression</th>
                            <th className="px-6 py-4 w-[15%] text-center">Score</th>
                            <th className="px-6 py-4 w-[15%] text-center">Dernière Signature</th>
                            <th className="px-6 py-4 text-right">Statut</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.blocks.map((bloc) => (
                            <tr key={bloc.id} className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 align-top">
                                    <p className="font-semibold text-slate-900 text-base">{bloc.title}</p>
                                    {bloc.latestComment && (
                                        <div className="mt-2 text-xs italic text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                                            "{bloc.latestComment}"
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 align-middle">
                                    <div className="flex flex-col gap-1">
                                        <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${bloc.percent === 100 ? 'bg-slate-900' : 'bg-slate-600'}`}
                                                style={{ width: `${bloc.percent}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-mono text-slate-500 text-right">{bloc.percent}%</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 align-middle text-center font-mono text-slate-600">
                                    {bloc.acquiredIndicators} / {bloc.totalIndicators}
                                </td>
                                <td className="px-6 py-4 align-middle text-center text-slate-600">
                                    {bloc.lastSignedAt
                                        ? bloc.lastSignedAt.toLocaleDateString()
                                        : <span className="text-slate-300">-</span>
                                    }
                                </td>
                                <td className="px-6 py-4 align-middle text-right">
                                    <StatusBadge status={bloc.status} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    {/* Footer Row */}
                    <tfoot className="bg-slate-900 text-white font-bold">
                        <tr>
                            <td className="px-6 py-4 uppercase">Total Global</td>
                            <td className="px-6 py-4">
                                <div className="h-2.5 w-full bg-slate-700 rounded-full overflow-hidden border border-slate-600">
                                    <div
                                        className="h-full bg-white"
                                        style={{ width: `${data.globalAverage}%` }}
                                    />
                                </div>
                            </td>
                            <td className="px-6 py-4 text-center font-mono text-lg">{data.globalAverage}%</td>
                            <td colSpan={2}></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Observations & Security */}
            <div className="grid grid-cols-3 gap-8 mt-12 mb-8">
                <div className="col-span-2 p-6 border border-slate-200 bg-slate-50 rounded-sm min-h-[150px]">
                    <h3 className="text-xs font-bold uppercase text-slate-500 mb-4 tracking-wider">Observations Globales du CFA</h3>
                    <div className="h-0.5 w-8 bg-slate-300 mb-4"></div>
                    <p className="text-slate-400 italic text-sm">[Espace réservé pour les commentaires manuels avant signature finale]</p>
                </div>

                <div className="col-span-1 flex flex-col justify-end items-end text-right space-y-2">
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                        <ShieldCheck className="w-5 h-5" />
                        <span>Certifié Conforme</span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                        Hash de contrôle:
                        <br />
                        <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200 mt-1 inline-block">
                            {data.verificationHash}
                        </span>
                    </div>
                    <div className="text-[10px] text-slate-300 uppercase tracking-widest mt-4">
                        Alternance-360 Secure Print
                    </div>
                </div>
            </div>

            <div className="text-center mt-16 print:hidden">
                <p className="text-amber-600 text-sm">💡 Astuce : Utilisez Ctrl+P pour voir le rendu final.</p>
            </div>
        </div>
    )
}
