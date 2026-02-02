"use client";

import { useState } from "react";
import { updateEnvApiKey } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Cpu, Loader2, CheckCircle2 } from "lucide-react";

export function AiSettingsForm({ currentKey }: { currentKey?: string }) {
    const [apiKey, setApiKey] = useState(currentKey || "");
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await updateEnvApiKey(apiKey);
            if (result.success) {
                toast.success(result.message);
                toast.info("Un redémarrage du serveur peut être nécessaire pour prendre en compte le changement.");
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            console.error(error);
            toast.error("Une erreur inattendue est survenue.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                    <Cpu size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900">Moteur Alternance 360 AI</h3>
                    <p className="text-sm text-slate-500">
                        Gestion assistée des référentiels et des preuves.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">
                        État du Service
                    </p>
                    <p className="text-sm font-semibold text-slate-700">
                        {apiKey ? "Configuré" : "Non configuré"}
                    </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">
                        Moteur Actif
                    </p>
                    <p className="text-sm font-semibold text-slate-700">
                        Google Gemini 1.5 Flash
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="apiKey">Clé API Google (Gemini)</Label>
                    <div className="flex gap-2">
                        <Input
                            id="apiKey"
                            type="password"
                            placeholder="AIzaSy..."
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="font-mono text-sm"
                        />
                    </div>
                    <p className="text-xs text-slate-500">
                        Cette clé sera stockée localement dans votre fichier .env.
                    </p>
                </div>

                <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl mb-4">
                    <h4 className="text-sm font-bold text-blue-900 mb-2">
                        Note importante
                    </h4>
                    <p className="text-sm text-blue-800 leading-relaxed">
                        Pour que les changements prennent effet, vous devrez peut-être redémarrer votre serveur de développement (`npm run dev`) après l'enregistrement.
                    </p>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enregistrement...
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Sauvegarder la configuration
                        </>
                    )}
                </Button>
            </form>
        </div>
    );
}
