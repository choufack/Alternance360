import { auth } from "@/auth";
import db from "@/lib/db";
import { Plus, Trash2, Calendar, Pencil, Users, FileSpreadsheet, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { createPromotion, deletePromotion, updatePromotion, importStudentsAction, generateTSFForPromotionAction } from "@/app/actions/promotions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default async function PromotionsPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const promotions = await db.promotion.findMany({
        where: { tenantId: session.user.tenantId || "default" },
        include: { filiere: true, _count: { select: { users: true } } },
        orderBy: { startDate: 'desc' }
    });

    const filieres = await db.filiere.findMany({
        where: { tenantId: session.user.tenantId || "default" }
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Promotions</h1>
                    <p className="text-slate-500">Planifiez vos sessions de formation</p>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                            <Plus size={16} /> Nouvelle Promo
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Créer une promotion</DialogTitle>
                        </DialogHeader>
                        <form action={async (formData) => {
                            "use server"
                            await createPromotion({
                                name: formData.get("name") as string,
                                year: parseInt(formData.get("year") as string),
                                filiereId: formData.get("filiereId") as string,
                                startDate: new Date(formData.get("startDate") as string),
                                endDate: new Date(formData.get("endDate") as string),
                            })
                        }}>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Nom</Label>
                                        <Input name="name" placeholder="Ex: Septembre 2025" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Année</Label>
                                        <Input name="year" type="number" defaultValue={2025} required />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Filière</Label>
                                    <select name="filiereId" className="w-full p-2 border rounded-md" required>
                                        <option value="">Sélectionner...</option>
                                        {filieres.map(f => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Début</Label>
                                        <Input name="startDate" type="date" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Fin</Label>
                                        <Input name="endDate" type="date" required />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit">Créer la promotion</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Promotion</TableHead>
                            <TableHead>Filière</TableHead>
                            <TableHead>Dates</TableHead>
                            <TableHead>Étudiants</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {promotions.map((promo) => (
                            <TableRow key={promo.id}>
                                <TableCell className="font-bold flex items-center gap-2">
                                    <Calendar size={14} className="text-slate-400" />
                                    {promo.name} <span className="text-slate-400 font-normal">({promo.year})</span>
                                </TableCell>
                                <TableCell>{promo.filiere.name}</TableCell>
                                <TableCell className="text-sm text-slate-500">
                                    {format(promo.startDate, 'dd MMM yyyy', { locale: fr })} - {format(promo.endDate, 'dd MMM yyyy', { locale: fr })}
                                </TableCell>
                                <TableCell>{promo._count.users} apprenants</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        {/* Edit / Manage Link - Now goes to Detail Page */}
                                        <Button variant="ghost" size="icon" className="text-blue-500 hover:text-blue-700 hover:bg-blue-50" asChild>
                                            <Link href={`/admin/promotions/${promo.id}`}>
                                                <Pencil size={16} />
                                            </Link>
                                        </Button>
                                        {/* Dialog removed */}

                                        {/* Manage Dialog (Import + TSF) */}
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50">
                                                    <Users size={16} />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-2xl">
                                                <DialogHeader>
                                                    <DialogTitle>Gestion de la promotion</DialogTitle>
                                                    <DialogDescription>Importer des apprenants et générer les parcours TSF.</DialogDescription>
                                                </DialogHeader>

                                                <div className="space-y-6 py-4">
                                                    {/* Import Section */}
                                                    <div className="space-y-4 border p-4 rounded-lg bg-slate-50">
                                                        <div className="flex items-center gap-2">
                                                            <FileSpreadsheet className="text-emerald-600" size={20} />
                                                            <h3 className="font-semibold">Importer des apprenants (CSV)</h3>
                                                        </div>
                                                        <p className="text-sm text-slate-500">Format: Prénom, Nom, Email (un par ligne)</p>

                                                        <form action={async (formData) => {
                                                            "use server"
                                                            await importStudentsAction(promo.id, formData.get("csvData") as string)
                                                        }}>
                                                            <div className="space-y-4">
                                                                <Textarea
                                                                    name="csvData"
                                                                    placeholder="Jean, Dupont, jean.dupont@email.com&#10;Marie, Martin, marie@email.com"
                                                                    className="font-mono text-sm"
                                                                    rows={5}
                                                                />
                                                                <Button type="submit" variant="outline" className="w-full">
                                                                    <Users size={16} className="mr-2" /> Importer les étudiants
                                                                </Button>
                                                            </div>
                                                        </form>
                                                    </div>

                                                    {/* TSF Generation Section */}
                                                    <div className="space-y-4 border p-4 rounded-lg bg-slate-50">
                                                        <div className="flex items-center gap-2">
                                                            <Wand2 className="text-purple-600" size={20} />
                                                            <h3 className="font-semibold">Génération des TSF</h3>
                                                        </div>
                                                        <p className="text-sm text-slate-500">Initialise les parcours et livrets pour tous les étudiants de la promo.</p>

                                                        <form action={async () => {
                                                            "use server"
                                                            await generateTSFForPromotionAction(promo.id)
                                                        }}>
                                                            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                                                                <Wand2 size={16} className="mr-2" /> Générer les TSF
                                                            </Button>
                                                        </form>
                                                        <Button variant="outline" className="w-full border-purple-200 text-purple-700 hover:bg-purple-50" asChild>
                                                            <Link href={`/admin/promotions/${promo.id}`}>
                                                                <FileSpreadsheet size={16} className="mr-2" /> Voir les plannings TSF
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </div>

                                            </DialogContent>
                                        </Dialog>

                                        {/* Delete Action */}
                                        <form action={async () => {
                                            "use server"
                                            await deletePromotion(promo.id)
                                        }}>
                                            <Button variant="ghost" size="icon" className="text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                                                <Trash2 size={16} />
                                            </Button>
                                        </form>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div >
    );
}
