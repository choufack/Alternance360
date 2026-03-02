import { auth } from "@/auth";
import db from "@/lib/db";
import { Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { createFiliere, deleteFiliere, updateFiliere } from "@/app/actions/filieres";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function FilieresPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const filieres = await db.filiere.findMany({
        where: { tenantId: session.user.tenantId || "default" },
        include: { _count: { select: { promotions: true } } }
    });

    const referentiels = await db.referentiel.findMany({
        where: { tenantId: session.user.tenantId },
        select: { id: true, title: true, codeRncp: true }
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Filières</h1>
                    <p className="text-slate-500">Gérez vos parcours de formation</p>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                            <Plus size={16} /> Nouvelle Filière
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Ajouter une filière</DialogTitle>
                            <DialogDescription>Créez une nouvelle filière pour regrouper vos promotions.</DialogDescription>
                        </DialogHeader>
                        <form action={async (formData) => {
                            "use server"
                            await createFiliere({
                                name: formData.get("name") as string,
                                description: formData.get("description") as string,
                                referentielId: formData.get("referentielId") as string
                            })
                        }}>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Nom de la filière</Label>
                                    <Input name="name" placeholder="Ex: Développeur Web" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Input name="description" placeholder="Optionnel" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Référentiel associé (RNCP)</Label>
                                    <select name="referentielId" className="w-full p-2 border rounded-md text-sm">
                                        <option value="">Aucun</option>
                                        {referentiels.map(ref => (
                                            <option key={ref.id} value={ref.id}>{ref.codeRncp} - {ref.title}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit">Créer</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead>Référentiel</TableHead>
                            <TableHead>Promotions</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filieres.map((filiere) => (
                            <TableRow key={filiere.id}>
                                <TableCell className="font-medium">
                                    <Link
                                        href={`/admin/filieres/${filiere.id}`}
                                        className="font-bold text-slate-900 hover:text-emerald-600 hover:underline transition-colors"
                                    >
                                        {filiere.name}
                                    </Link>
                                </TableCell>

                                <TableCell className="text-slate-500">{filiere.referentielId ? "Lié" : "Non lié"}</TableCell>
                                <TableCell>{filiere._count.promotions} promos</TableCell>
                                <TableCell className="text-right flex justify-end gap-2">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-blue-500 hover:text-blue-700 hover:bg-blue-50">
                                                <Pencil size={16} />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Modifier la filière</DialogTitle>
                                            </DialogHeader>
                                            <form action={async (formData) => {
                                                "use server"
                                                await updateFiliere({
                                                    id: filiere.id,
                                                    name: formData.get("name") as string,
                                                    description: formData.get("description") as string,
                                                    referentielId: formData.get("referentielId") as string
                                                })
                                            }}>
                                                <div className="space-y-4 py-4">
                                                    <div className="space-y-2">
                                                        <Label>Nom de la filière</Label>
                                                        <Input name="name" defaultValue={filiere.name} required />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Description</Label>
                                                        <Input name="description" defaultValue={filiere.description || ""} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Référentiel associé (RNCP)</Label>
                                                        <select name="referentielId" defaultValue={filiere.referentielId || ""} className="w-full p-2 border rounded-md text-sm">
                                                            <option value="">Aucun</option>
                                                            {referentiels.map(ref => (
                                                                <option key={ref.id} value={ref.id}>{ref.codeRncp} - {ref.title}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <Button type="submit">Enregistrer</Button>
                                                </DialogFooter>
                                            </form>
                                        </DialogContent>
                                    </Dialog>

                                    <form action={async () => {
                                        "use server"
                                        await deleteFiliere(filiere.id)
                                    }}>
                                        <Button variant="ghost" size="icon" className="text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                                            <Trash2 size={16} />
                                        </Button>
                                    </form>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filieres.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-slate-400">
                                    Aucune filière créée pour le moment.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
