"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createFiliere, updateFiliere } from "@/app/actions/filieres";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";

export function FiliereDialog({ mode = "create", filiere, referentiels }: { mode?: "create" | "edit", filiere?: any, referentiels: any[] }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        const data = {
            name: formData.get("name") as string,
            description: formData.get("description") as string,
            referentielId: formData.get("referentielId") as string || undefined // Handle empty string as undefined
        };

        let result;
        if (mode === "edit" && filiere) {
            result = await updateFiliere({ id: filiere.id, ...data });
        } else {
            result = await createFiliere(data);
        }

        setIsLoading(false);
        if (result?.success) {
            toast.success(mode === "create" ? "Filière créée" : "Filière modifiée");
            setOpen(false);
        } else {
            toast.error(result?.error || "Une erreur est survenue");
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {mode === "create" ? (
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                        <Plus size={16} /> Nouvelle Filière
                    </Button>
                ) : (
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-emerald-600">
                        <Pencil size={16} />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{mode === "create" ? "Créer une filière" : "Modifier la filière"}</DialogTitle>
                </DialogHeader>
                <form action={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Nom</Label>
                        <Input name="name" defaultValue={filiere?.name} placeholder="Ex: Développeur Web" required />
                    </div>
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Input name="description" defaultValue={filiere?.description} placeholder="Optionnel" />
                    </div>
                    <div className="space-y-2">
                        <Label>Référentiel associé (RNCP)</Label>
                        <select name="referentielId" defaultValue={filiere?.referentielId || ""} className="w-full p-2 border rounded-md text-sm bg-background">
                            <option value="">Aucun</option>
                            {referentiels.map((ref) => (
                                <option key={ref.id} value={ref.id}>
                                    {ref.codeRncp} - {ref.title}
                                </option>
                            ))}
                        </select>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Enregistrement..." : (mode === "create" ? "Créer" : "Modifier")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
