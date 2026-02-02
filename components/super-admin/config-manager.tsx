"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Save,
    Shield,
    Zap,
    Bell,
    Database,
    Lock,
    RefreshCw,
    CheckCircle2,
    Server,
    HardDrive,
    Activity,
    Palette,
    Cpu,
    Plus,
    Trash2,
    X
} from "lucide-react"
import { savePlatformConfig, deletePlatformConfig } from "@/app/actions/super-admin"
import { checkSystemHealth, SystemHealth } from "@/app/actions/system-health"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface ConfigManagerProps {
    settings: any[]
}

export function ConfigManager({ settings }: ConfigManagerProps) {
    const [localSettings, setLocalSettings] = useState(settings)
    const [health, setHealth] = useState<SystemHealth | null>(null)
    const [isLoadingHealth, setIsLoadingHealth] = useState(false)
    const [loadingSave, setLoadingSave] = useState<string | null>(null)
    const [isAdding, setIsAdding] = useState(false)
    const [newKey, setNewKey] = useState("")
    const [newValue, setNewValue] = useState("")
    const [newGroup, setNewGroup] = useState("IA")
    const [newIsSecret, setNewIsSecret] = useState(false)

    // Derived groups from existing settings
    const existingGroups = Array.from(new Set(localSettings.map(s => s.group || 'GENERAL')))
    const displayGroups = existingGroups.length > 0 ? existingGroups : ['BRANDING', 'SECURITY', 'IA', 'TECH']

    // Group settings by their 'group' field
    const groupedSettings = localSettings.reduce((acc: any, s: any) => {
        const group = s.group || 'GENERAL'
        if (!acc[group]) acc[group] = []
        acc[group].push(s)
        return acc
    }, {})

    const fetchHealth = async () => {
        setIsLoadingHealth(true)
        try {
            const data = await checkSystemHealth()
            setHealth(data)
            toast.success("État du système actualisé")
        } catch (error) {
            toast.error("Impossible de récupérer l'état du système")
        } finally {
            setIsLoadingHealth(false)
        }
    }

    useEffect(() => {
        fetchHealth()
    }, [])

    const handleSave = async (key: string, value: string, group: string, isSecret: boolean) => {
        setLoadingSave(key)
        try {
            await savePlatformConfig(key, value, group, isSecret)
            toast.success("Paramètre sauvegardé")
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de la sauvegarde")
        } finally {
            setLoadingSave(null)
        }
    }

    const handleAdd = async () => {
        if (!newKey) {
            toast.error("La clé est requise")
            return
        }
        setLoadingSave("NEW")
        try {
            await savePlatformConfig(newKey, newValue, newGroup, newIsSecret)
            setLocalSettings([...localSettings, { key: newKey, value: newValue, group: newGroup, isSecret: newIsSecret }])
            setIsAdding(false)
            setNewKey("")
            setNewValue("")
            toast.success("Nouveau paramètre ajouté")
        } catch (error) {
            toast.error("Erreur lors de l'ajout")
        } finally {
            setLoadingSave(null)
        }
    }

    const handleDelete = async (key: string) => {
        if (!confirm(`Supprimer le paramètre "${key}" ?`)) return
        setLoadingSave(key)
        try {
            await deletePlatformConfig(key)
            setLocalSettings(localSettings.filter(s => s.key !== key))
            toast.success("Paramètre supprimé")
        } catch (error) {
            toast.error("Erreur lors de la suppression")
        } finally {
            setLoadingSave(null)
        }
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <div className="flex items-center justify-between bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4 px-4">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <Plus size={20} />
                        </div>
                        <div>
                            <h4 className="font-black text-slate-900 leading-none mb-1">Configuration Illimitée.</h4>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Gérez toutes vos briques système</p>
                        </div>
                    </div>
                    <Button
                        onClick={() => setIsAdding(true)}
                        className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl h-12 px-6 font-bold flex gap-2 transition-all active:scale-95 border-none"
                    >
                        Ajouter un Paramètre
                    </Button>
                </div>

                {isAdding && (
                    <Card className="border-blue-200 bg-blue-50/30 rounded-[2rem] overflow-hidden">
                        <CardContent className="p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="font-black text-blue-900 text-xl">Nouvelle Entrée</h3>
                                <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)} className="rounded-full h-8 w-8 p-0">
                                    <X size={16} />
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-blue-900 font-bold ml-1">Clé de l'API / Paramètre</Label>
                                    <Input
                                        value={newKey}
                                        onChange={(e) => setNewKey(e.target.value)}
                                        placeholder="ex: anthropic_api_key, stock_limit..."
                                        className="bg-white border-blue-100 rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-blue-900 font-bold ml-1">Catégorie</Label>
                                    <div className="flex gap-2">
                                        <select
                                            value={newGroup}
                                            onChange={(e) => setNewGroup(e.target.value)}
                                            className="grow h-10 px-3 bg-white border border-blue-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none"
                                        >
                                            <option value="IA">Intelligence Artificielle</option>
                                            <option value="TECH">Technique / Infrastructure</option>
                                            <option value="BRANDING">Design / Identité</option>
                                            <option value="SECURITY">Sécurité</option>
                                            {existingGroups.filter(g => !['IA', 'TECH', 'BRANDING', 'SECURITY'].includes(g)).map(g => (
                                                <option key={g} value={g}>{g}</option>
                                            ))}
                                            <option value="CUSTOM">+ Autre...</option>
                                        </select>
                                        {newGroup === 'CUSTOM' && (
                                            <Input
                                                placeholder="Nom..."
                                                className="w-32 bg-white border-blue-100 rounded-xl"
                                                onBlur={(e) => {
                                                    if (e.target.value) setNewGroup(e.target.value.toUpperCase())
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <Label className="text-blue-900 font-bold ml-1">Valeur</Label>
                                    <Input
                                        value={newValue}
                                        onChange={(e) => setNewValue(e.target.value)}
                                        type={newIsSecret ? "password" : "text"}
                                        placeholder="Collez ici la valeur ou la clé..."
                                        className="bg-white border-blue-100 rounded-xl"
                                    />
                                </div>
                                <div className="md:col-span-2 flex items-center justify-between bg-white/50 p-4 rounded-xl border border-blue-100">
                                    <div className="flex items-center gap-3">
                                        <Lock size={16} className="text-blue-600" />
                                        <div>
                                            <div className="text-sm font-bold text-blue-900 leading-none mb-1">Masquer la valeur</div>
                                            <div className="text-[10px] text-blue-400 font-medium uppercase tracking-tight">Utilisé pour les clés API secrètes</div>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={newIsSecret}
                                        onCheckedChange={setNewIsSecret}
                                    />
                                </div>
                            </div>

                            <Button
                                onClick={handleAdd}
                                disabled={loadingSave === "NEW"}
                                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black transition-all shadow-lg shadow-blue-600/20 border-none"
                            >
                                {loadingSave === "NEW" ? <RefreshCw className="animate-spin" /> : "Enregistrer dans la base"}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <Tabs defaultValue={displayGroups[0]} className="w-full">
                    <TabsList className="bg-white p-1 rounded-2xl border border-slate-100 mb-6 h-auto flex-wrap overflow-x-auto no-scrollbar">
                        {displayGroups.map(group => (
                            <TabsTrigger key={group} value={group} className="rounded-xl px-4 py-3 data-[state=active]:bg-slate-900 data-[state=active]:text-white gap-2 text-sm font-bold whitespace-nowrap min-w-fit flex-1 border-none shadow-none">
                                {group === 'BRANDING' ? <Palette size={16} /> :
                                    group === 'SECURITY' ? <Shield size={16} /> :
                                        group === 'IA' ? <Zap size={16} /> :
                                            group === 'TECH' ? <Cpu size={16} /> :
                                                <Database size={16} />}
                                {group}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {displayGroups.map(group => (
                        <TabsContent key={group} value={group}>
                            <Card className="border-slate-100 rounded-[2rem] shadow-xl shadow-slate-200/40 overflow-hidden">
                                <CardContent className="p-8 space-y-6">
                                    <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-6">
                                        <div>
                                            <h3 className="font-black text-slate-900 text-2xl tracking-tight leading-none mb-1">{group}</h3>
                                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{groupedSettings[group]?.length || 0} Paramètre(s)</p>
                                        </div>
                                        <Badge className="bg-slate-100 text-slate-600 border-none font-black px-4 py-2 rounded-xl">
                                            {group === 'IA' || group === 'SECURITY' ? 'SÉCURISÉ' : 'PUBLIC'}
                                        </Badge>
                                    </div>

                                    <div className="grid gap-4">
                                        {groupedSettings[group]?.map((setting: any) => (
                                            <div key={setting.key} className="flex flex-col gap-2 p-5 rounded-2xl bg-white border border-slate-100 transition-all hover:border-slate-200 hover:shadow-md">
                                                <div className="flex items-center justify-between">
                                                    <Label className="font-black text-slate-700 tracking-tight text-sm">{setting.key}</Label>
                                                    <div className="flex items-center gap-2">
                                                        {setting.isSecret && (
                                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-100">
                                                                <Lock size={10} className="text-amber-600" />
                                                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">Secret</span>
                                                            </div>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDelete(setting.key)}
                                                            className="h-8 w-8 p-0 text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="flex gap-4">
                                                    <Input
                                                        defaultValue={setting.value}
                                                        type={setting.isSecret ? "password" : "text"}
                                                        placeholder={setting.isSecret ? "••••••••••••••••" : "Valeur..."}
                                                        className="grow bg-slate-50/50 border-slate-100 rounded-xl focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all"
                                                        onBlur={(e) => handleSave(setting.key, e.target.value, group, setting.isSecret)}
                                                    />
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            const input = e.currentTarget.parentElement?.querySelector('input');
                                                            if (input) handleSave(setting.key, input.value, group, setting.isSecret);
                                                        }}
                                                        disabled={loadingSave === setting.key}
                                                        className="shrink-0 p-2.5 rounded-xl border-none hover:bg-slate-200"
                                                    >
                                                        {loadingSave === setting.key ? <RefreshCw className="animate-spin text-blue-600" /> : <Save size={18} className="text-slate-900" />}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {(!groupedSettings[group] || groupedSettings[group].length === 0) && (
                                        <div className="flex flex-col items-center justify-center p-12 text-center">
                                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
                                                <Activity size={32} />
                                            </div>
                                            <p className="text-slate-400 font-medium">Aucun paramètre configuré.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    ))}
                </Tabs>
            </div>

            <div className="space-y-6">
                <Card className="bg-slate-900 text-white border-none rounded-[2rem] shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Database size={120} />
                    </div>
                    <CardContent className="p-10 space-y-8 relative">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <Badge className={cn("bg-blue-500/20 text-blue-400 border-none font-bold", health?.system.status === 'CRITICAL' && "bg-rose-500/20 text-rose-400 border-none")}>
                                    Système Vital
                                </Badge>
                                {health && (
                                    <span className="text-[10px] font-mono text-slate-500">
                                        Last Check: {new Date(health.lastUpdated).toLocaleTimeString()}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none mb-4">État de la Plateforme.</h2>
                            <p className="text-slate-400 font-medium">Monitoring en temps réel des services critiques.</p>
                        </div>

                        {!health ? (
                            <div className="animate-pulse space-y-4">
                                <div className="h-12 bg-white/5 rounded-2xl" />
                                <div className="h-12 bg-white/5 rounded-2xl" />
                                <div className="h-12 bg-white/5 rounded-2xl" />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Database size={16} className="text-slate-300" />
                                            <span className="font-bold text-sm text-slate-300">Base de Données</span>
                                        </div>
                                        <Badge variant="outline" className={cn("border-0 font-bold", health.database.status === 'OK' ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400")}>
                                            {health.database.status}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span>PostgreSQL Primary</span>
                                        <span className={cn("font-mono", health.database.latency > 100 ? "text-amber-400" : "text-emerald-400")}>
                                            {health.database.latency}ms
                                        </span>
                                    </div>
                                </div>

                                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Server size={16} className="text-slate-300" />
                                            <span className="font-bold text-sm text-slate-300">Charge CPU</span>
                                        </div>
                                        <div className="text-xs font-bold text-slate-400">{health.system.load}%</div>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full rounded-full transition-all duration-500",
                                                health.system.status === 'CRITICAL' ? 'bg-rose-500' :
                                                    health.system.status === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500'
                                            )}
                                            style={{ width: `${Math.min(health.system.load * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <Button
                            onClick={fetchHealth}
                            disabled={isLoadingHealth}
                            className="w-full h-14 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-black gap-2 transition-all active:scale-95 border-none"
                        >
                            <RefreshCw size={18} className={cn(isLoadingHealth && "animate-spin")} />
                            {isLoadingHealth ? "Vérification..." : "Actualiser"}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
