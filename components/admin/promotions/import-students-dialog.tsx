"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { importStudentsAction } from "@/app/actions/promotions";
import { toast } from "sonner";
import { Upload, Loader2, FileText } from "lucide-react";

export function ImportStudentsDialog({ promotionId }: { promotionId: string }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [csvData, setCsvData] = useState("");

    async function handleImport() {
        if (!csvData.trim()) return;
        setIsLoading(true);

        const result = await importStudentsAction(promotionId, csvData);

        setIsLoading(false);
        if (result.success) {
            toast.success(`${result.count} étudiants importés avec succès !`);
            setOpen(false);
            setCsvData("");
        } else {
            toast.error(result.error || "Erreur lors de l'import");
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Upload size={16} /> Importer des étudiants
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Importer des étudiants</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 flex gap-2">
                        <FileText className="shrink-0" size={18} />
                        <div>
                            <p className="font-semibold mb-1">Format attendu (CSV simple) :</p>
                            <code className="block bg-white/50 p-2 rounded">
                                nom,prenom,email<br />
                                Dupont,Jean,jean.dupont@email.com<br />
                                Martin,Sophie,sophie.martin@email.com
                            </code>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Données CSV</Label>
                        <Textarea
                            rows={10}
                            placeholder="Collez vos données ici..."
                            value={csvData}
                            onChange={(e) => setCsvData(e.target.value)}
                            className="font-mono text-sm"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleImport} disabled={isLoading || !csvData.trim()}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Importation en cours...
                            </>
                        ) : (
                            "Importer les étudiants"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
