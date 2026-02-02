"use client"

import { TSFGrid } from "@/components/pedagogie/tsf-builder"
import { AssessmentStepper } from "@/components/pedagogie/assessment-stepper"
import { RadarChartDemo } from "@/components/pedagogie/radar-chart"
import { ProofUploadForm } from "@/components/pedagogie/proof-upload"
import { ApprenticeJournal } from "@/components/pedagogie/journal-de-bord"
import { ProofValidationCard } from "@/components/pedagogie/proof-validation-card"
import { ProgressDashboard } from "@/components/pedagogie/progress-dashboard"
import { LivretSuivi } from "@/components/pedagogie/livret-suivi"
import { JournalEntryForm } from "@/components/pedagogie/journal-entry-form"
import { TutorQuickEval } from "@/components/pedagogie/tutor-quick-eval"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Printer, FileBadge, BarChart3, GraduationCap, CheckCircle2, BookOpen, UserCheck, Settings, Clock } from "lucide-react"

export default function DemoPage() {

    // --- MOCK DATA ---

    const mockApprentice = {
        name: "Thomas Legrand",
        email: "t.legrand@tech-solutions.fr",
        contract_start: "01/09/2024",
        contract_end: "31/08/2026",
        referentiel: "Développeur Web et Web Mobile (RNCP31114)"
    }

    const mockProgress = [
        { title: "Bloc 1 - Front-end", total: 6, validated: 4 },
        { title: "Bloc 2 - Back-end", total: 4, validated: 1 },
        { title: "Bloc 3 - DevOps", total: 3, validated: 0 }
    ]

    const mockPeriods = [
        { id: "p1", label: "Semestre 1" }, { id: "p2", label: "Semestre 2" }
    ]

    const mockCompetences = [
        {
            id: "c1",
            description: "Maquetter une application",
            bloc_title: "Bloc 1",
            items: [
                { id: "i1", label: "Respect des normes d'accessibilité" },
                { id: "i2", label: "Utilisation des composants Figma" }
            ]
        },
        { id: "c2", description: "Réaliser une interface statique", bloc_title: "Bloc 1" },
        {
            id: "c3",
            description: "Développer une interface dynamique",
            bloc_title: "Bloc 1",
            items: [
                { id: "i3", label: "Gestion des états (State Management)" },
                { id: "i4", label: "Connexion API REST" },
                { id: "i5", label: "Tests unitaires" }
            ]
        },
        { id: "c4", description: "Créer une base de données", bloc_title: "Bloc 2" },
    ]

    const mockActivities = [
        { id: "act1", date: "2025-06-25", titre: "Mise à jour UI Dashboard", description: "Utilisation de Tailwind 4 pour le refresh", reflexion_appris: "Maîtrise des nouveaux tokens CSS.", competenceIds: ["c1", "c3"] },
        { id: "act2", date: "2025-06-20", titre: "Migration PostgreSQL", description: "Passage des triggers sur Supabase", reflexion_appris: "Optimisation des requêtes RLS.", competenceIds: ["c4"] },
    ]

    const mockJournal = [
        { id: "pr1", competence_description: "Maquetter une application", type: "IMG" as const, status: "VALIDATED" as const, created_at: "2025-10-15", comment: "Maquette validée." },
        { id: "pr2", competence_description: "Créer une base de données", type: "PDF" as const, status: "PENDING" as const, created_at: "2025-12-20", comment: "Script SQL." },
    ]

    const pendingProofs = [
        { id: "pr2", user_name: "Thomas Legrand", competence_description: "Créer une base de données", url: "#", type: "PDF" as const, created_at: "2025-12-20", comment: "Script SQL." }
    ]

    const fullStructure = [
        {
            title: "Bloc 1 - Développement Front-end", competences: [
                { description: "Maquetter une application", status: "VALIDATED" },
                { description: "Réaliser une interface statique", status: "VALIDATED" },
                { description: "Développer une interface dynamique", status: "PENDING" }
            ]
        },
        {
            title: "Bloc 2 - Développement Back-end", competences: [
                { description: "Créer une base de données", status: "PENDING" },
            ]
        }
    ]

    return (
        <div className="bg-gray-100 min-h-screen font-sans selection:bg-blue-100 selection:text-blue-900">
            <div className="container mx-auto py-8 space-y-8 px-4 print:p-0 print:m-0 print:bg-white max-w-7xl">

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl shadow-sm border border-gray-100 print:hidden mb-12">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black italic text-blue-950 uppercase tracking-tighter flex items-center gap-3">
                            <span className="bg-blue-600 text-white px-3 py-1 rounded-xl shadow-lg shadow-blue-200">A</span>
                            Antigravity <span className="text-blue-600">v4.0</span>
                        </h1>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest pl-14">
                            Écosystème Pédagogique Mobile & Offline
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" className="rounded-2xl border-2 font-bold h-12 px-6 hover:bg-gray-50">
                            <Settings className="w-5 h-5 mr-2" /> Admin
                        </Button>
                        <Button className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black italic h-12 px-8 shadow-lg shadow-blue-200">
                            DÉLOGUER
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="journal" className="w-full print:hidden">
                    <TabsList className="flex flex-wrap md:grid md:grid-cols-4 mb-8 h-auto md:h-20 bg-gray-200/50 p-2 rounded-2xl border border-gray-200 gap-2">
                        <TabsTrigger value="journal" className="flex-1 flex items-center justify-center gap-3 font-black uppercase text-[10px] tracking-widest rounded-xl data-[state=active]:bg-white py-3 md:py-0">
                            <BookOpen className="w-4 h-4" /> Journal
                        </TabsTrigger>
                        <TabsTrigger value="tuteur" className="flex-1 flex items-center justify-center gap-3 font-black uppercase text-[10px] tracking-widest rounded-xl data-[state=active]:bg-white py-3 md:py-0">
                            <UserCheck className="w-4 h-4" /> Tuteur
                        </TabsTrigger>
                        <TabsTrigger value="overview" className="flex-1 flex items-center justify-center gap-3 font-black uppercase text-[10px] tracking-widest rounded-xl data-[state=active]:bg-white py-3 md:py-0">
                            <BarChart3 className="w-4 h-4" /> Progrès
                        </TabsTrigger>
                        <TabsTrigger value="livret" className="flex-1 flex items-center justify-center gap-3 font-black uppercase text-[10px] tracking-widest rounded-xl data-[state=active]:bg-white py-3 md:py-0">
                            <FileBadge className="w-4 h-4" /> Rapport
                        </TabsTrigger>
                    </TabsList>

                    {/* --- MODULE JOURNAL 2.0 --- */}
                    <TabsContent value="journal" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid lg:grid-cols-12 gap-8 items-start">
                            <div className="lg:col-span-7">
                                <JournalEntryForm competences={mockCompetences} />
                            </div>
                            <div className="lg:col-span-5 space-y-6">
                                <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                                    <h4 className="text-xs font-black uppercase text-gray-400 mb-6 tracking-[0.2em] flex items-center gap-2">
                                        <Clock className="w-4 h-4" /> Historique Récent
                                    </h4>
                                    <ApprenticeJournal proofs={mockJournal} />
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* --- MODULE TUTEUR (PHASE 4) --- */}
                    <TabsContent value="tuteur" className="animate-in fade-in slide-in-from-left-4 duration-500">
                        <div className="max-w-[450px] mx-auto border-[10px] border-gray-900 rounded-[3rem] shadow-2xl overflow-hidden bg-white mb-12">
                            <div className="h-6 w-32 bg-gray-900 mx-auto rounded-b-2xl mb-2" />
                            <TutorQuickEval
                                apprenticeName={mockApprentice.name}
                                activities={mockActivities}
                                competences={mockCompetences}
                            />
                        </div>
                        <div className="text-center">
                            <p className="text-gray-400 italic text-sm">Ceci est la vue mobile optimisée du Maître d'Apprentissage.</p>
                        </div>
                    </TabsContent>

                    {/* --- REST OF OLD TABS --- */}
                    <TabsContent value="overview" className="space-y-8 animate-in fade-in duration-500">
                        <ProgressDashboard progress={mockProgress} />
                        <div className="grid lg:grid-cols-2 gap-8 items-start">
                            <div className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
                                <h3 className="text-xl font-black italic text-blue-900 uppercase tracking-tighter mb-6">Planning TSF</h3>
                                <TSFGrid contractId="demo" periods={mockPeriods as any} competences={mockCompetences} initialMappings={[]} />
                            </div>
                            <div className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
                                <h3 className="text-xl font-black italic text-blue-900 uppercase tracking-tighter mb-6">Gap Analysis</h3>
                                <RadarChartDemo />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="livret" className="space-y-8 animate-in fade-in duration-500">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-6 bg-white p-6 rounded-2xl border border-gray-100">
                            <div className="space-y-1">
                                <p className="text-lg font-black text-gray-900 tracking-tight">Génération de PDF réglementaire</p>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest italic">Document d'audit Qualiopi Indicateur 11</p>
                            </div>
                            <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white font-black italic h-12 px-8 rounded-xl shadow-lg shadow-blue-200 w-full sm:w-auto">
                                <Printer className="w-5 h-5 mr-3" /> EXPORTER LE LIVRET
                            </Button>
                        </div>
                        <div className="shadow-2xl rounded-3xl overflow-hidden transform scale-95 origin-top hover:scale-100 transition-transform duration-700 border border-gray-200">
                            <LivretSuivi apprentice={mockApprentice} blocs={fullStructure} />
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Print View */}
                <div className="hidden print:block">
                    <LivretSuivi apprentice={mockApprentice} blocs={fullStructure} />
                </div>
            </div>
        </div>
    )
}
