"use server";

import db from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { generateTSFForPromotion } from "@/app/actions/bulk-generate-tsf";
import { logAuditEvent } from "./audit";

// Helper for default password hash
const hashPassword = async (pwd: string) => {
    // Basic hash for demo/dev if bcrypt not available, but should use library
    // Assuming bcryptjs is installed as it's common in NextAuth
    // Use dynamic import if needed or just simple string for now if not critical
    return "hashed_password_placeholder"; // Placeholder as consistent with previous logic
};

// --- PROMOTIONS ---

export async function createPromotion(data: { name: string, year: number, startDate: Date, endDate: Date, filiereId: string }) {
    const session = await auth();
    if (!session?.user?.id || !session.user.tenantId) return { error: "Non autorisé" };

    try {
        const promotion = await db.promotion.create({
            data: {
                ...data,
                tenantId: session.user.tenantId
            }
        });

        await logAuditEvent("CREATE_PROMOTION", "Promotion", promotion.id, { name: data.name });

        revalidatePath("/admin/promotions");
        return { success: true, data: promotion };
    } catch (error) {
        console.error("Create Promo Error:", error);
        return { error: "Erreur lors de la création de la promotion" };
    }
}

export async function updatePromotion(id: string, data: { name?: string, year?: number, startDate?: Date, endDate?: Date }) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Non autorisé" };

    try {
        await db.promotion.update({
            where: {
                id,
                tenantId: session.user.tenantId // Security
            },
            data
        });

        await logAuditEvent("UPDATE_PROMOTION", "Promotion", id, data);

        revalidatePath("/admin/promotions");
        return { success: true };
    } catch (error) {
        return { error: "Erreur update promo" };
    }
}

export async function deletePromotion(id: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Non autorisé" };

    try {
        await db.promotion.delete({
            where: {
                id,
                tenantId: session.user.tenantId // Security
            }
        });

        await logAuditEvent("DELETE_PROMOTION", "Promotion", id);

        revalidatePath("/admin/promotions");
        return { success: true };
    } catch (error) {
        return { error: "Erreur delete promo" };
    }
}

// --- IMPORT & TSF ---

export async function importStudentsAction(promotionId: string, csvData: string) {
    const session = await auth();
    if (!session?.user?.id || !session.user.tenantId) return { error: "Non autorisé" };

    try {
        const promotion = await db.promotion.findUnique({
            where: { id: promotionId },
            include: { filiere: true }
        });
        if (!promotion) return { error: "Promotion introuvable" };

        const lines = csvData.trim().split("\n");
        let count = 0;

        for (const line of lines) {
            const [firstName, lastName, email] = line.split(",").map(s => s.trim());
            if (!email) continue;

            // 1. Create User if not exists
            const existingUser = await db.user.findUnique({ where: { email } });
            let userId = existingUser?.id;

            if (!existingUser) {
                const newUser = await db.user.create({
                    data: {
                        email,
                        firstName,
                        lastName,
                        fullName: `${firstName} ${lastName}`,
                        role: "apprentice",
                        tenantId: session.user.tenantId,
                        promotionId: promotion.id,
                        // Set a default password or handle via invitation logic
                        password: "ChangeMe123!",
                    }
                });
                userId = newUser.id;
            } else {
                // Update existing user to link to this promotion
                await db.user.update({
                    where: { id: userId },
                    data: { promotionId: promotion.id }
                });
            }

            if (userId) {
                // 2. Create Contract if not exists for this promotion context
                // We check if there's an active contract for this user in this tenant/period
                // For simplicity, we create one if none exists in overlapping dates

                const existingContract = await db.contract.findFirst({
                    where: { userId, tenantId: session.user.tenantId }
                });

                if (!existingContract) {
                    const contract = await db.contract.create({
                        data: {
                            startDate: promotion.startDate,
                            endDate: promotion.endDate,
                            tenantId: session.user.tenantId,
                            userId,
                            referentielId: promotion.filiere.referentielId || "", // Ensure referentielId is present
                            periodType: "SEMESTER", // Default
                        }
                    });

                    await logAuditEvent("CREATE_CONTRACT", "Contract", contract.id, { userId });
                }
            }
            count++;
        }

        await logAuditEvent("IMPORT_STUDENTS", "Promotion", promotionId, { count });

        revalidatePath(`/admin/promotions`);
        revalidatePath(`/admin/users`);
        return { success: true, count };
    } catch (error: any) {
        console.error("Import Error:", error);
        return { error: error.message || "Erreur d'import" };
    }
}

export async function generateTSFForPromotionAction(promotionId: string) {
    // Redirect logic to the new centralized bulk generator which handles promotion dates correctness
    const result = await generateTSFForPromotion(promotionId);

    // Convert return format if necessary, though simpler to just return result directly if UI adapts
    if (result.success) {
        revalidatePath(`/admin/promotions/${promotionId}`);
        return { success: true, count: result.count };
    } else {
        return { error: result.error || "Erreur inconnue" };
    }
}

export async function notifyStudent(contractId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Non autorisé" };

    try {
        const contract = await db.contract.findUnique({
            where: { id: contractId },
            include: {
                user: { select: { id: true, email: true, firstName: true, lastName: true, fullName: true } }
            }
        });

        if (!contract || !contract.user) return { error: "Contrat ou apprenti introuvable" };

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:2222";
        const livretUrl = `${appUrl}/dashboard/livret`;

        const { sendEmail } = await import("@/lib/email");
        await sendEmail(
            contract.user.email,
            "Votre parcours de formation est prêt 🎓",
            `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
                <h1 style="color: #10b981; font-size: 28px; font-weight: 900;">Bonjour ${contract.user.firstName || contract.user.fullName} 👋</h1>
                <p style="font-size: 16px; line-height: 1.6; color: #475569;">
                    Votre <strong>Tableau Stratégique de Formation (TSF)</strong> a été préparé par votre centre de formation.
                    Vous pouvez dès maintenant consulter votre parcours et signer votre livret en ligne.
                </p>
                <div style="margin: 32px 0;">
                    <a href="${livretUrl}"
                       style="display: inline-block; background: #10b981; color: white; padding: 14px 28px;
                              text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px;">
                        👉 Accéder à mon livret
                    </a>
                </div>
                <p style="font-size: 13px; color: #94a3b8;">
                    Cet email vous a été envoyé par votre centre de formation. Si vous avez des questions, contactez votre formateur.
                </p>
            </div>
            `
        );

        await logAuditEvent("NOTIFY_STUDENT", "Contract", contractId, { userId: contract.user.id });

        return { success: true };
    } catch (error: any) {
        console.error("Notify Student Error:", error);
        return { error: error.message || "Erreur lors de l'envoi de la notification" };
    }
}
