'use client'

import { useState, useTransition, useEffect } from 'react'
// import { uploadRNCP, type UploadState } from '@/app/actions/upload-rncp'
export type UploadState = {
    message: string
    error: boolean
    details?: string
    previewData?: any // Structure of parsed RNCP data
}
import { fetchRNCPAction, enrichRNCPAction, saveRNCPAction, getAIStatusAction } from '@/app/actions/import-rncp-bridge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Upload, FileJson, CheckCircle, AlertCircle, Link, KeyRound, Sparkles, Database, Loader2, Zap, ZapOff, Cpu } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from '@/components/ui/badge'

const initialState: UploadState = {
    message: '',
    error: false,
    details: ''
}

export function RNCPImporter({ tenantId }: { tenantId?: string }) {
    const [isPending, startTransition] = useTransition()
    const [state, setState] = useState<UploadState>(initialState)
    const [activeTab, setActiveTab] = useState("file")

    // Bridge State
    const [bridgeCode, setBridgeCode] = useState("")
    const [bridgeStep, setBridgeStep] = useState<"IDLE" | "FETCHING_API" | "ENRICHING_AI" | "SAVING" | "COMPLETED" | "ERROR">("IDLE")
    const [bridgeError, setBridgeError] = useState("")
    const [apiData, setApiData] = useState<any>(null)
    const [structuredData, setStructuredData] = useState<any>(null)
    const [aiStatus, setAiStatus] = useState<{ configured: boolean, model?: string } | null>(null)

    useEffect(() => {
        getAIStatusAction().then(res => setAiStatus(res))
    }, [])

    const [pendingFile, setPendingFile] = useState<FormData | null>(null)

    async function handleFileImport(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        setPendingFile(formData) // Store for confirmation

        startTransition(async () => {
            try {
                // Request Preview
                formData.set('preview', 'true')
                const response = await fetch('/api/upload-rncp', {
                    method: 'POST',
                    body: formData
                })
                const result = await response.json()

                if (result.preview) {
                    setState({ ...initialState, previewData: result.data } as any)
                } else {
                    setState(result)
                }
            } catch (err) {
                setState({ message: "Erreur réseau", error: true, details: "L'upload a échoué" })
            }
        })
    }

    async function confirmImport() {
        if (!pendingFile) return

        startTransition(async () => {
            try {
                pendingFile.delete('preview') // Remove preview flag
                const response = await fetch('/api/upload-rncp', {
                    method: 'POST',
                    body: pendingFile
                })
                const result = await response.json()

                setState(result) // Show final success/error

                if (!result.error) {
                    // Reset preview to show the success message clearly
                    // Maybe redirect or show a "Go to Atelier" button?
                    setState({ ...result, previewData: null } as any)
                }
            } catch (err) {
                setState({ message: "Erreur lors de la confirmation", error: true, details: "Sauvegarde échouée" })
            }
        })
    }

    async function handleBridgeImport() {
        if (!bridgeCode) return
        setBridgeError("")
        setBridgeStep("FETCHING_API")

        try {
            // Step 1: API
            const apiRes = await fetchRNCPAction(bridgeCode)
            if (!apiRes.success || !apiRes.data) {
                throw new Error(apiRes.error || "Erreur API")
            }
            setApiData(apiRes.data)
            setBridgeStep("ENRICHING_AI")

            // Step 2: AI
            const aiRes = await enrichRNCPAction(apiRes.data)
            if (!aiRes.success || !aiRes.data) {
                throw new Error(aiRes.error || "Erreur IA")
            }
            setStructuredData(aiRes.data)
            setBridgeStep("SAVING")

            // Step 3: Save
            const saveRes = await saveRNCPAction(bridgeCode, apiRes.data.title, aiRes.data)
            if (!saveRes.success) {
                throw new Error(saveRes.error || "Erreur Sauvegarde")
            }
            setBridgeStep("COMPLETED")

        } catch (err: any) {
            console.error(err)
            setBridgeError(err.message)
            setBridgeStep("ERROR")
        }
    }

    return (
        <Card className="w-full max-w-lg mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-600" />
                    Import Référentiel
                </CardTitle>
                <CardDescription>
                    Ajoutez un référentiel RNCP à votre catalogue.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="file">Fichier JSON</TabsTrigger>
                        <TabsTrigger value="bridge">Bridge (Code RNCP)</TabsTrigger>
                    </TabsList>

                    <TabsContent value="file">
                        <form onSubmit={handleFileImport} className="space-y-4">
                            <input type="hidden" name="tenant_id" value={tenantId} />

                            {!state.previewData ? (
                                <>
                                    <div className="grid w-full items-center gap-1.5">
                                        <label htmlFor="file" className="text-sm font-medium">Fichier RNCP (JSON ou XML)</label>
                                        <div className="flex items-center gap-2 border border-dashed border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                            <Upload className="w-4 h-4 text-gray-400" />
                                            <Input
                                                id="file"
                                                name="file"
                                                type="file"
                                                accept=".json, .xml"
                                                required
                                                className="text-sm cursor-pointer file:border-0 file:bg-transparent"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2 bg-purple-50 p-4 rounded-lg border border-purple-100">
                                        <input type="checkbox" id="useAI" name="useAI" className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-600" />
                                        <label htmlFor="useAI" className="text-sm font-medium text-purple-900">Nettoyer avec l'IA</label>
                                    </div>
                                    <Button type="submit" disabled={isPending} className="w-full">
                                        {isPending ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : "Prévisualiser"}
                                    </Button>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                        <h3 className="font-bold text-lg mb-2">{state.previewData.title || "Titre Inconnu"}</h3>
                                        <div className="flex gap-2 mb-4">
                                            <Badge variant="outline">{state.previewData.code_rncp}</Badge>
                                            <Badge variant="secondary">{state.previewData.blocs?.length || 0} Blocs</Badge>
                                        </div>

                                        <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                            {state.previewData.blocs?.map((bloc: any, i: number) => (
                                                <div key={i} className="text-sm p-2 bg-white rounded border border-slate-100">
                                                    <p className="font-semibold">{bloc.title}</p>
                                                    <p className="text-xs text-slate-500">{bloc.competences?.length || 0} compétences</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button type="button" variant="outline" onClick={() => setState(initialState)} className="flex-1">
                                            Annuler
                                        </Button>
                                        <Button type="button" onClick={confirmImport} disabled={isPending} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                                            {isPending ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                            Confirmer l'Import
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {state.message && !state.previewData && (
                                <div className={`p-3 rounded-md text-sm flex items-start gap-2 ${state.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                    {state.error ? <AlertCircle className="w-4 h-4 mt-0.5" /> : <CheckCircle className="w-4 h-4 mt-0.5" />}
                                    <div><p className="font-medium">{state.message}</p>{state.details && <p className="text-xs mt-1 opacity-80">{state.details}</p>}</div>
                                </div>
                            )}
                        </form>
                    </TabsContent>

                    <TabsContent value="bridge" className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Code RNCP</label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Ex: RNCP38565"
                                    value={bridgeCode}
                                    onChange={(e) => setBridgeCode(e.target.value)}
                                    disabled={bridgeStep !== "IDLE" && bridgeStep !== "ERROR"}
                                />
                                <Button
                                    onClick={handleBridgeImport}
                                    disabled={!bridgeCode || (bridgeStep !== "IDLE" && bridgeStep !== "ERROR")}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                    Importer
                                </Button>
                            </div>
                        </div>

                        {bridgeStep !== "IDLE" && (
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-4">
                                {/* Step 1: API */}
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${bridgeStep === "FETCHING_API" ? "border-blue-500 text-blue-500 animate-pulse" :
                                        (bridgeStep === "ENRICHING_AI" || bridgeStep === "SAVING" || bridgeStep === "COMPLETED") ? "bg-blue-100 text-blue-600 border-blue-200" : "border-slate-200 text-slate-300"
                                        }`}>
                                        {bridgeStep === "FETCHING_API" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-slate-900">Récupération des données officielles</p>
                                        <p className="text-xs text-slate-500">API France Compétences / Opendatasoft</p>
                                    </div>
                                    {(bridgeStep === "ENRICHING_AI" || bridgeStep === "SAVING" || bridgeStep === "COMPLETED") && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                                </div>

                                {/* Step 2: AI */}
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${bridgeStep === "ENRICHING_AI" ? "border-purple-500 text-purple-500 animate-pulse" :
                                        (bridgeStep === "SAVING" || bridgeStep === "COMPLETED") ? "bg-purple-100 text-purple-600 border-purple-200" : "border-slate-200 text-slate-300"
                                        }`}>
                                        {bridgeStep === "ENRICHING_AI" ? <Sparkles className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-slate-900">Analyse pédagogique par IA</p>
                                        <p className="text-xs text-slate-500">Structuration Blocs / Compétences / Indicateurs</p>
                                    </div>
                                    {(bridgeStep === "SAVING" || bridgeStep === "COMPLETED") && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                                </div>

                                {/* Step 3: Save */}
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${bridgeStep === "SAVING" ? "border-emerald-500 text-emerald-500 animate-pulse" :
                                        bridgeStep === "COMPLETED" ? "bg-emerald-100 text-emerald-600 border-emerald-200" : "border-slate-200 text-slate-300"
                                        }`}>
                                        {bridgeStep === "SAVING" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-slate-900">Génération du référentiel</p>
                                        <p className="text-xs text-slate-500">Sauvegarde dans votre catalogue</p>
                                    </div>
                                    {bridgeStep === "COMPLETED" && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                                </div>

                                {bridgeStep === "COMPLETED" && (
                                    <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm font-medium flex items-center gap-2 mt-4">
                                        <CheckCircle className="w-4 h-4" />
                                        Importation terminée avec succès !
                                    </div>
                                )}

                                {bridgeStep === "ERROR" && (
                                    <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm font-medium flex items-center gap-2 mt-4">
                                        <AlertCircle className="w-4 h-4" />
                                        {bridgeError || "Une erreur est survenue"}
                                    </div>
                                )}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
            <CardFooter className="flex flex-col border-t bg-slate-50/50 p-6 rounded-b-xl gap-4">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        {aiStatus?.configured ? (
                            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                        ) : (
                            <ZapOff className="w-4 h-4 text-slate-400" />
                        )}
                        <span className="text-sm font-bold text-slate-700">Moteur IA</span>
                    </div>
                    {aiStatus ? (
                        <Badge variant={aiStatus.configured ? "default" : "outline"} className={aiStatus.configured ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "text-slate-400 border-slate-200"}>
                            {aiStatus.configured ? `Opérationnel (${aiStatus.model})` : "Non configuré"}
                        </Badge>
                    ) : (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                    )}
                </div>

                {!aiStatus?.configured && (
                    <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex gap-3 items-start">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-[11px] text-amber-800 leading-tight">
                            <p className="font-bold mb-1">Configuration Requise</p>
                            <p>La clé API Gemini doit être configurée par le <strong>Super Administrateur</strong> dans les <em>Paramètres Généraux</em> de la plateforme pour activer l'IA.</p>
                        </div>
                    </div>
                )}
            </CardFooter>
        </Card>
    )
}
