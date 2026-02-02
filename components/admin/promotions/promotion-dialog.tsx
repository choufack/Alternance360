"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPromotion, updatePromotion } from "@/app/actions/promotions";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { format } from "date-fns";

export function PromotionDialog({ mode = "create", promotion, filieres }: { mode?: "create" | "edit", promotion?: any, filieres: any[] }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        const data = {
            name: formData.get("name") as string,
            year: parseInt(formData.get("year") as string),
            filiereId: formData.get("filiereId") as string,
            startDate: new Date(formData.get("startDate") as string),
            endDate: new Date(formData.get("endDate") as string),
        };

        let result;
        if (mode === "edit" && promotion) {
            // For update, we might not want to change filiereId easily as it affects relations, but let's allow it for now or keep it flexible.
            // The updatePromotion action needs to be checked if it allows all fields.
            result = await updatePromotion(promotion.id, data);
        } else {
            result = await createPromotion(data);
        }

        setIsLoading(false);
        if (result?.success) {
            toast.success(mode === "create" ? "Promotion créée" : "Promotion modifiée");
            setOpen(false);
        } else {
            toast.error(result?.error || "Une erreur est survenue");
        }
    }

    // Helpers for date inputs
    const formatDate = (date: Date | string) => {
        if (!date) return "";
        return new Date(date).toISOString().split('T')[0];
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {mode === "create" ? (
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                        <Plus size={16} /> Nouvelle Promo
                    </Button>
                ) : (
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-emerald-600">
                        <Pencil size={16} />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{mode === "create" ? "Créer une promotion" : "Modifier la promotion"}</DialogTitle>
                </DialogHeader>
                <form action={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nom</Label>
                            <Input name="name" defaultValue={promotion?.name} placeholder="Ex: Septembre 2025" required />
                        </div>
                        <div className="space-y-2">
                            <Label>Année</Label>
                            <Input name="year" type="number" defaultValue={promotion?.year || 2025} required />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Filière</Label>
                        <select name="filiereId" defaultValue={promotion?.filiereId || ""} className="w-full p-2 border rounded-md bg-background" required>
                            <option value="">Sélectionner...</option>
                            {filieres.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Début</Label>
                            <Input name="startDate" type="date" defaultValue={formatDate(promotion?.startDate)} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Fin</Label>
                            <Input name="endDate" type="date" defaultValue={formatDate(promotion?.endDate)} required />
                        </div>
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
