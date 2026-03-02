
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { auth } from '@/auth';
import { sendEmailToApprenti } from '@/lib/mail';
import { randomBytes, createHash } from 'crypto';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const apiKey = req.headers.get('x-api-key');
    const masterKey = process.env.API_SECRET_KEY || 'debug-secret-123';

    // 1. Authorization check (Session or API Key)
    const isAuthorized = (session?.user && (session.user.role === 'admin' || session.user.role === 'super_admin')) || (apiKey === masterKey);

    if (!isAuthorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: promotionId } = await params;
    const { periodLabel } = await req.json().catch(() => ({}));

    if (!periodLabel) {
        return NextResponse.json({ error: "Missing periodLabel" }, { status: 400 });
    }

    try {
        // 2. Fetch all apprentices in this promotion
        const promotion = await db.promotion.findUnique({
            where: { id: promotionId },
            include: {
                users: {
                    where: { role: 'apprentice' },
                    include: {
                        contracts: {
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                            include: {
                                periodes: true
                            }
                        },
                    },
                },
            },
        });

        if (!promotion) {
            return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
        }

        const apprentices = promotion.users;
        let successCount = 0;
        let failCount = 0;
        const details = [];

        // 3. Process each apprentice
        for (const apprentice of apprentices) {
            if (!apprentice.email) {
                console.warn(`Skipping apprentice ${apprentice.fullName} - Missing email.`);
                failCount++;
                details.push({ name: apprentice.fullName, status: 'failed', reason: 'Missing email' });
                continue;
            }

            const contract = apprentice.contracts[0];
            if (!contract) {
                console.warn(`Skipping apprentice ${apprentice.fullName} - No contract found.`);
                failCount++;
                details.push({ name: apprentice.fullName, status: 'failed', reason: 'No contract' });
                continue;
            }

            // Find matching period for this contract
            const targetPeriod = contract.periodes.find(p => p.label === periodLabel);
            if (!targetPeriod) {
                console.warn(`Skipping apprentice ${apprentice.fullName} - Period "${periodLabel}" not found.`);
                failCount++;
                details.push({ name: apprentice.fullName, status: 'failed', reason: `Période "${periodLabel}" introuvable` });
                continue;
            }

            try {
                // 4. Generate a secure MagicToken
                const rawToken = randomBytes(32).toString('hex');
                const tokenHash = createHash('sha256').update(rawToken).digest('hex');

                // 14 days validity
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 14);

                await db.magicToken.create({
                    data: {
                        tokenHash,
                        type: 'APPRENTICE_TSF_ACCESS',
                        expiresAt,
                        userId: apprentice.id,
                        contractId: contract.id,
                        periodId: targetPeriod.id
                    }
                });

                // 5. Send Email
                const mailResult = await sendEmailToApprenti(
                    {
                        firstName: apprentice.firstName || apprentice.fullName || 'Apprenti',
                        lastName: apprentice.lastName || '',
                        email: apprentice.email
                    },
                    rawToken
                );

                if (mailResult.success) {
                    successCount++;
                    details.push({ name: apprentice.fullName, status: 'success' });
                } else {
                    failCount++;
                    details.push({ name: apprentice.fullName, status: 'failed', reason: mailResult.error });
                }
            } catch (err: any) {
                console.error(`Error processing apprentice ${apprentice.fullName}:`, err.message);
                failCount++;
                details.push({ name: apprentice.fullName, status: 'failed', reason: 'Internal error' });
            }
        }

        return NextResponse.json({
            success: true,
            summary: {
                total: apprentices.length,
                success: successCount,
                failed: failCount
            },
            details
        });

    } catch (error: any) {
        console.error('Trigger Email Session Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
