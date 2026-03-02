import { auth } from "@/auth"
import db from "@/lib/db"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    FileText, ArrowLeft, Calendar,
    Users, Wand2, GraduationCap
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { TSFGrid } from "@/components/pedagogie/tsf-builder"
import { generateTSFForPromotionAction } from "@/app/actions/promotions"
import { TSFModalWrapper } from "@/components/pedagogie/tsf-modal-wrapper"
import { NotifyStudentButton } from "@/components/pedagogie/notify-student-button"
import { BulkNotifyApprenticesButton } from "@/components/pedagogie/bulk-notify-apprentices-button"

// Helper to fetch competences for a contract (moved outside component or kept here)
async function getCompetencesForContract(referentielId: string | null) {
    if (!referentielId) return []
    const blocs = await db.blocCompetence.findMany({
        where: { referentielId: referentielId },
        include: { competences: { include: { indicateurs: true } } },
        orderBy: { orderIndex: 'asc' }
    })
    // Flatten
    const flat: any[] = []
    blocs.forEach(b => {
        b.competences.forEach(c => {
            flat.push({
                id: c.id,
                description: c.description || "Sans description",
                bloc_title: b.title,
                indicateurs: c.indicateurs.map(i => i.description)
            })
        })
    })
    return flat
}

export default async function PromotionDetailPage({
    params,
    searchParams
}: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ studentId?: string }>
}) {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")

    const { id } = await params
    const { studentId } = await searchParams

    const promotion = await db.promotion.findUnique({
        where: { id },
        include: {
            filiere: true
        }
    })

    if (!promotion) return <div>Promotion introuvable</div>

    // Fetch students (Lightweight for list)
    const apprentices = await db.user.findMany({
        where: {
            role: 'apprentice',
            promotionId: id
        },
        include: {
            contracts: {
                where: {
                    periodes: { some: {} } // TSF Initialized check
                },
                select: {
                    id: true,
                    referentielId: true,
                    tsfMapping: {
                        select: { status: true }
                    },
                    periodes: { select: { id: true, label: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: 1
            }
        },
        orderBy: { lastName: 'asc' }
    })

    // Prepare Focused Student Data if selected
    let focusedStudentData = null
    if (studentId) {
        const student = await db.user.findUnique({
            where: { id: studentId },
            include: {
                contracts: {
                    where: { periodes: { some: {} } },
                    include: {
                        tsfMapping: true,
                        periodes: { orderBy: { orderIndex: 'asc' } }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        })

        if (student && student.contracts[0]) {
            const contract = student.contracts[0]
            const competences = await getCompetencesForContract(contract.referentielId)
            const periods = contract.periodes

            // Filter and Map mappings safely
            const mappings = contract.tsfMapping
                .filter(m => m.periodId !== null)
                .map(m => ({
                    period_id: m.periodId!,
                    competence_id: m.competenceId,
                    flag_cfa: m.flagCfa,
                    flag_entreprise: m.flagEntreprise,
                    status: m.status
                }))

            focusedStudentData = {
                student,
                contract,
                competences,
                periods,
                mappings
            }
        }
    }

    return (
        <div className="container mx-auto py-10 px-4 space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <Button variant="ghost" size="sm" asChild className="w-fit -ml-2 text-slate-500">
                    <Link href="/admin/promotions">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Retour aux promotions
                    </Link>
                </Button>

                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                                {promotion.name}
                            </h1>
                            <Badge variant="secondary" className="text-sm">
                                {promotion.filiere?.name}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-slate-500 font-medium">
                            <div className="flex items-center gap-2">
                                <Calendar size={16} />
                                {format(promotion.startDate, 'MMM yyyy', { locale: fr })} - {format(promotion.endDate, 'MMM yyyy', { locale: fr })}
                            </div>
                            <div className="flex items-center gap-2">
                                <Users size={16} />
                                {apprentices.length} Apprenants
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {/* Bulk Generation Button embedded here */}
                        <form action={async () => {
                            "use server"
                            await generateTSFForPromotionAction(promotion.id)
                        }}>
                            <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20">
                                <Wand2 size={16} className="mr-2" /> Générer les TSF
                            </Button>
                        </form>

                        {/* Extract unique period labels for the promotion */}
                        {(() => {
                            const labels = new Set<string>()
                            apprentices.forEach(a => {
                                a.contracts[0]?.periodes?.forEach(p => {
                                    if ((p as any).label) labels.add((p as any).label)
                                })
                            })
                            return (
                                <BulkNotifyApprenticesButton
                                    promotionId={promotion.id}
                                    apprenticeCount={apprentices.length}
                                    availablePeriods={Array.from(labels)}
                                />
                            )
                        })()}
                    </div>
                </div>
            </div>

            {/* Content Tabs / Sections */}
            <div className="grid gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Suivi Pédagogique (TSF)</CardTitle>
                        <CardDescription>Gérez les parcours de formation individualisés</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Apprenant</TableHead>
                                    <TableHead>Statut TSF</TableHead>
                                    <TableHead>Progression</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {apprentices.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                                            Aucun étudiant dans cette promotion. Commencez par en importer.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    apprentices.map((apprentice) => {
                                        const contract = apprentice.contracts[0]
                                        const hasMapping = contract && contract.tsfMapping.length > 0
                                        const acquis = contract?.tsfMapping.filter(m => m.status === 'ACQUIS').length ?? 0
                                        const total = contract?.tsfMapping.length ?? 0
                                        const progressPct = total > 0 ? Math.round((acquis / total) * 100) : 0

                                        return (
                                            <TableRow key={apprentice.id}>
                                                <TableCell>
                                                    <Link href={`/admin/users/${apprentice.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity group">
                                                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors">
                                                            {apprentice.firstName?.[0]}{apprentice.lastName?.[0]}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">{apprentice.firstName} {apprentice.lastName}</div>
                                                            <div className="text-xs text-slate-500">{apprentice.email}</div>
                                                        </div>
                                                    </Link>
                                                </TableCell>
                                                <TableCell>
                                                    {hasMapping ? (
                                                        <Badge className="bg-emerald-100 text-emerald-700 border-none">
                                                            Actif
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-slate-400">
                                                            Non initialisé
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-emerald-500 rounded-full transition-all"
                                                                style={{ width: `${progressPct}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-500">{progressPct}%</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {contract && (
                                                            <NotifyStudentButton
                                                                contractId={contract.id}
                                                                studentName={`${apprentice.firstName} ${apprentice.lastName}`}
                                                            />
                                                        )}
                                                        {hasMapping ? (
                                                            <Button size="sm" variant="outline" asChild>
                                                                <Link href={`?studentId=${apprentice.id}`} scroll={false}>
                                                                    Gérer TSF
                                                                </Link>
                                                            </Button>
                                                        ) : (
                                                            <span className="text-xs text-slate-400 italic">Générer d'abord</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Focused Student Modal */}
            {focusedStudentData && (
                <TSFModalWrapper studentName={`${focusedStudentData.student.firstName} ${focusedStudentData.student.lastName}`}>
                    <TSFGrid
                        contractId={focusedStudentData.contract.id}
                        periods={focusedStudentData.periods}
                        competences={focusedStudentData.competences}
                        initialMappings={focusedStudentData.mappings}
                        isAdmin={true}
                    />
                </TSFModalWrapper>
            )}
        </div>
    )
}
