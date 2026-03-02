import { auth } from "@/auth";
import db from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, Users, Pencil, Layers, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiliereEditModal } from "@/components/admin/filiere-edit-modal";

export default async function FiliereDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const tenantId = session.user.tenantId;

    const filiere = await db.filiere.findUnique({
        where: { id },
        include: {
            referentiel: { select: { id: true, title: true, codeRncp: true } },
            promotions: {
                include: {
                    _count: { select: { users: true } }
                },
                orderBy: { startDate: 'desc' }
            },
            _count: { select: { promotions: true } }
        }
    });

    if (!filiere || (tenantId && filiere.tenantId !== tenantId)) notFound();

    // Fetch apprentices linked to this filiere via promotions
    const apprentices = await db.user.findMany({
        where: {
            role: 'apprentice',
            promotion: {
                filiereId: id
            }
        },
        include: {
            promotion: { select: { name: true } },
            contracts: { select: { id: true }, take: 1 }
        },
        orderBy: { lastName: 'asc' }
    });

    const referentiels = await db.referentiel.findMany({
        where: { tenantId: tenantId || undefined },
        select: { id: true, title: true, codeRncp: true }
    });

    return (
        <div className="container mx-auto py-10 px-4 space-y-8 max-w-5xl">
            {/* Back */}
            <Button variant="ghost" size="sm" asChild className="w-fit -ml-2 text-slate-500 hover:text-slate-900">
                <Link href="/admin/filieres">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Retour aux filières
                </Link>
            </Button>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-[0.2em] mb-2">
                        <Layers size={14} />
                        <span>Filière</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-3">
                        {filiere.name}
                    </h1>
                    {filiere.description && (
                        <p className="text-slate-500 font-medium max-w-xl">{filiere.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-3">
                        <Badge variant="secondary" className="gap-1 px-3 py-1">
                            <Users size={12} />
                            {filiere._count.promotions} promotions
                        </Badge>
                        <Badge variant="secondary" className="gap-1 px-3 py-1">
                            <Users size={12} />
                            {apprentices.length} apprentis
                        </Badge>
                        {filiere.referentiel && (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 gap-1 px-3 py-1">
                                <FileText size={12} />
                                {filiere.referentiel.codeRncp}
                            </Badge>
                        )}
                    </div>
                </div>
                <FiliereEditModal filiere={filiere} referentiels={referentiels} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left - Apprentices list */}
                <div className="lg:col-span-2">
                    <Card className="rounded-[2rem] border-slate-100 shadow-lg">
                        <CardHeader className="px-8 pt-8 pb-4">
                            <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                                <Users size={20} className="text-emerald-600" />
                                Apprentis ({apprentices.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-8 pb-8">
                            {apprentices.length === 0 ? (
                                <div className="py-12 text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                                        <Users size={32} />
                                    </div>
                                    <p className="text-slate-500 font-medium">Aucun apprenti dans cette filière.</p>
                                    <p className="text-slate-400 text-sm mt-1">Importez des apprenants depuis une promotion.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {apprentices.map((apprentice) => (
                                        <Link
                                            key={apprentice.id}
                                            href={`/admin/users/${apprentice.id}`}
                                            className="flex items-center justify-between py-4 hover:bg-slate-50 px-2 rounded-xl transition-colors group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center font-bold text-sm text-slate-600 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors">
                                                    {apprentice.firstName?.[0]}{apprentice.lastName?.[0]}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900">
                                                        {apprentice.firstName} {apprentice.lastName}
                                                    </div>
                                                    <div className="text-xs text-slate-500">{apprentice.email}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {apprentice.promotion && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {apprentice.promotion.name}
                                                    </Badge>
                                                )}
                                                {apprentice.contracts.length > 0 && (
                                                    <Badge className="bg-emerald-50 text-emerald-700 border-none text-xs">
                                                        Contrat actif
                                                    </Badge>
                                                )}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right - Promotions */}
                <div>
                    <Card className="rounded-[2rem] border-slate-100 shadow-lg">
                        <CardHeader className="px-8 pt-8 pb-4">
                            <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                                <BookOpen size={18} className="text-indigo-600" />
                                Promotions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-8 pb-8 space-y-3">
                            {filiere.promotions.length === 0 ? (
                                <p className="text-slate-400 text-sm text-center py-4">Aucune promotion.</p>
                            ) : (
                                filiere.promotions.map(promo => (
                                    <Link
                                        key={promo.id}
                                        href={`/admin/promotions/${promo.id}`}
                                        className="block p-4 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-100 transition-all group"
                                    >
                                        <div className="font-bold text-slate-900 group-hover:text-indigo-700">{promo.name}</div>
                                        <div className="text-xs text-slate-500 mt-1">{promo._count.users} apprenants</div>
                                    </Link>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
