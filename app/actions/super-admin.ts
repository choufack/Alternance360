'use server'

import db from '@/lib/db'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { logAuditEvent } from './audit'
import fs from 'fs/promises'
import path from 'path'

export async function provisionTenant(leadId: string) {
    const session = await auth()
    if (!session || session.user.role !== 'super_admin') throw new Error('Non autorisé')

    const lead = await db.lead.findUnique({
        where: { id: leadId }
    })

    if (!lead) throw new Error('Lead non trouvé')
    if (lead.status === 'PROCESSED') throw new Error('Lead déjà traité')

    try {
        const result = await db.$transaction(async (tx) => {
            // 1. Create the Tenant
            const tenantId = lead.tenantName
                ? lead.tenantName.toLowerCase().replace(/\s+/g, '-')
                : `tenant-${Date.now()}`

            const tenant = await tx.tenant.create({
                data: {
                    id: tenantId,
                    name: lead.tenantName || 'Nouveau CFA',
                    primaryColor: '#4f46e5'
                }
            })

            // 2. Create the first Admin user
            const defaultPassword = 'password123'
            const hashedPassword = await bcrypt.hash(defaultPassword, 10)

            const adminUser = await tx.user.create({
                data: {
                    email: lead.email,
                    password: hashedPassword,
                    fullName: `Admin ${tenant.name}`,
                    role: 'admin',
                    tenantId: tenant.id
                }
            })

            // 3. Create initial Subscription
            await tx.subscription.create({
                data: {
                    tenantId: tenant.id,
                    plan: 'ESSENTIAL',
                    status: 'ACTIVE',
                    startDate: new Date()
                }
            })

            // 4. Mark lead as processed
            await tx.lead.update({
                where: { id: leadId },
                data: {
                    status: 'PROCESSED',
                    processedAt: new Date()
                }
            })

            return { tenant, adminUser }
        })

        await logAuditEvent('PROVISION_TENANT', 'Tenant', result.tenant.id, {
            adminId: session.user.id,
            leadId,
            adminEmail: lead.email
        })

        revalidatePath('/super-admin/tenants')
        revalidatePath('/super-admin/leads')

        // Send Welcome Email asynchronously (fire and forget to not block UI)
        sendTenantWelcomeEmail(lead.email, result.tenant.name, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
            .catch(err => console.error("Failed to send welcome email", err))

        return { success: true, tenantId: result.tenant.id }
    } catch (error) {
        console.error('Provisioning error:', error)
        throw new Error('Erreur lors du déploiement de l\'instance')
    }
}

// Helper to send email after transaction (best practice: don't block transaction on email)
// We already log audit event, now we send email.
import { sendTenantWelcomeEmail } from '@/lib/email'

export async function rejectLead(leadId: string) {
    const session = await auth()
    if (!session || !['super_admin', 'admin'].includes(session.user.role!)) {
        throw new Error('Non autorisé')
    }

    await db.lead.update({
        where: { id: leadId },
        data: {
            status: 'REJECTED',
            processedAt: new Date()
        }
    })

    revalidatePath('/super-admin/leads')
    return { success: true }
}
export async function getGlobalStats() {
    const session = await auth()
    if (!session || session.user.role !== 'super_admin') {
        throw new Error('Non autorisé')
    }

    const [tenantCount, userCount, leadCount, activeLeads, referentielCount, contractCount] = await Promise.all([
        db.tenant.count(),
        db.user.count(),
        db.lead.count(),
        db.lead.count({ where: { status: 'PENDING' } }),
        db.referentiel.count(),
        db.contract.count()
    ])

    return {
        tenantCount,
        userCount,
        leadCount,
        activeLeads,
        referentielCount,
        contractCount
    }
}

export async function getTenants() {
    const session = await auth()
    if (!session || session.user.role !== 'super_admin') {
        throw new Error('Non autorisé')
    }

    const tenants = await db.tenant.findMany({
        include: {
            _count: {
                select: {
                    users: true,
                    contracts: true,
                    referentiels: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    return tenants
}

export async function getGlobalUsers() {
    const session = await auth()
    if (!session || session.user.role !== 'super_admin') {
        throw new Error('Non autorisé')
    }

    const users = await db.user.findMany({
        include: {
            tenant: {
                select: {
                    name: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    return users
}

export async function getAuditLogs() {
    const session = await auth()
    if (!session || session.user.role !== 'super_admin') {
        throw new Error('Non autorisé')
    }

    return await db.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100
    })
}

export async function getGlobalReferentiels(search?: string) {
    const session = await auth()
    if (!session || session.user.role !== 'super_admin') throw new Error('Non autorisé')

    const whereClause: any = {}
    if (search) {
        whereClause.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { codeRncp: { contains: search, mode: 'insensitive' } }
        ]
    }

    return await db.referentiel.findMany({
        where: whereClause,
        include: {
            tenant: { select: { name: true } },
            _count: { select: { blocs: true, contracts: true } }
        },
        orderBy: [{ isGlobal: 'desc' }, { createdAt: 'desc' }]
    })
}

export async function createGlobalReferentiel(data: { codeRncp: string, title: string }) {
    const session = await auth()
    if (!session || session.user.role !== 'super_admin') {
        throw new Error("Unauthorized")
    }

    try {
        const referentiel = await db.referentiel.create({
            data: {
                codeRncp: data.codeRncp,
                title: data.title,
                isGlobal: true,
            }
        })

        await logAuditEvent('CREATE_GLOBAL_REFERENTIEL', 'Referentiel', referentiel.id, {
            codeRncp: data.codeRncp,
            title: data.title
        })

        revalidatePath('/super-admin/referentiels')
        return { success: true, referentiel }
    } catch (error) {
        console.error("Error creating global referentiel:", error)
        return { success: false, error: "Failed to create referentiel" }
    }
}

export async function toggleReferentielVisibility(referentielId: string) {
    const session = await auth()
    if (!session || session.user.role !== 'super_admin') {
        throw new Error("Unauthorized")
    }

    const referentiel = await db.referentiel.findUnique({
        where: { id: referentielId }
    })

    if (!referentiel) throw new Error("Referentiel not found")

    const updated = await db.referentiel.update({
        where: { id: referentielId },
        data: { isGlobal: !referentiel.isGlobal }
    })

    await logAuditEvent('TOGGLE_REFERENTIEL_VISIBILITY', 'Referentiel', referentielId, {
        isGlobal: updated.isGlobal
    })

    revalidatePath('/super-admin/referentiels')
    return { success: true, isGlobal: updated.isGlobal }
}

export async function getSubscriptions() {
    const session = await auth()
    if (!session || session.user.role !== 'super_admin') throw new Error('Non autorisé')

    return await db.subscription.findMany({
        include: {
            tenant: { select: { name: true, address: true } },
            invoices: { orderBy: { createdAt: 'desc' }, take: 1 }
        },
        orderBy: { startDate: 'desc' }
    })
}

export async function getReportStats() {
    const session = await auth()
    if (!session || session.user.role !== 'super_admin') throw new Error('Non autorisé')

    // Dummy logic for now, in a real app this would be heavy aggregation
    const totalUsers = await db.user.count()
    const activeContracts = await db.contract.count({ where: { endDate: { gte: new Date() } } })
    const totalRevenue = await db.invoice.aggregate({ _sum: { amount: true } })

    return {
        totalUsers,
        activeContracts,
        totalRevenue: totalRevenue._sum.amount || 0,
        monthlyGrowth: '+12.5%'
    }
}

export async function updateGlobalUser(userId: string, data: any) {
    const session = await auth()
    if (!session || session.user.role !== 'super_admin') throw new Error('Non autorisé')

    const user = await db.user.update({
        where: { id: userId },
        data: {
            role: data.role,
            tenantId: data.tenantId,
            fullName: data.fullName,
            email: data.email
        }
    })

    // Log Audit Event
    await logAuditEvent('SUPER_ADMIN_UPDATE_USER', 'User', user.id, {
        adminId: session.user.id,
        updatedFields: Object.keys(data)
    })

    revalidatePath('/super-admin/users')
    return { success: true }
}

export async function deleteUserGlobal(userId: string) {
    const session = await auth()
    if (!session || session.user.role !== 'super_admin') throw new Error('Non autorisé')

    const user = await db.user.delete({
        where: { id: userId }
    })

    await logAuditEvent('SUPER_ADMIN_DELETE_USER', 'User', userId, {
        adminId: session.user.id,
        userEmail: user.email
    })

    revalidatePath('/super-admin/users')
    return { success: true }
}



export async function createTenantGlobal(formData: FormData) {
    const session = await auth()
    if (!session || session.user.role !== 'super_admin') throw new Error('Non autorisé')

    const name = formData.get('name') as string
    const primaryColor = formData.get('primaryColor') as string || '#4f46e5'
    const siret = formData.get('siret') as string
    const address = formData.get('address') as string
    const ndaNumber = formData.get('ndaNumber') as string
    const uaiCode = formData.get('uaiCode') as string
    const legalRep = formData.get('legalRep') as string
    const contactEmail = formData.get('contactEmail') as string
    const contactPhone = formData.get('contactPhone') as string
    const website = formData.get('website') as string
    const qualiopiCert = formData.get('qualiopiCert') === 'true'

    // Generate ID from name
    const tenantId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000)

    // Handle Logo Upload
    const logoFile = formData.get('logo') as File | null
    let logoUrl = undefined

    if (logoFile && logoFile.size > 0) {
        try {
            const buffer = Buffer.from(await logoFile.arrayBuffer())
            const filename = `tenant-${tenantId}-${Date.now()}-${logoFile.name.replace(/\s/g, '_')}`
            const uploadDir = path.join(process.cwd(), 'public/uploads/tenants')
            await fs.mkdir(uploadDir, { recursive: true })
            const filepath = path.join(uploadDir, filename)
            await fs.writeFile(filepath, buffer)
            logoUrl = `/uploads/tenants/${filename}`
        } catch (error) {
            console.error("Logo upload failed", error)
        }
    }

    try {
        await db.$transaction(async (tx) => {
            // 1. Create Tenant
            const tenant = await tx.tenant.create({
                data: {
                    id: tenantId,
                    name,
                    primaryColor,
                    logoUrl,
                    siret, address, ndaNumber, uaiCode, legalRep, contactEmail, contactPhone, website, qualiopiCert
                }
            })

            // 2. Create Default Subscription
            await tx.subscription.create({
                data: {
                    tenantId: tenant.id,
                    plan: 'ESSENTIAL',
                    status: 'ACTIVE',
                    startDate: new Date()
                }
            })

            // 3. Create Placeholder Admin (Optional, helpful for manual creation)
            if (contactEmail) {
                const hashedPassword = await bcrypt.hash('password123', 10)
                await tx.user.create({
                    data: {
                        email: `admin.${tenantId}@alternance360.com`, // Temporary email to avoid conflict if contactEmail is real
                        password: hashedPassword,
                        fullName: `Admin ${name}`,
                        role: 'admin',
                        tenantId: tenant.id
                    }
                })
            }
        })

        await logAuditEvent('SUPER_ADMIN_CREATE_TENANT', 'Tenant', tenantId, {
            adminId: session.user.id,
            name
        })

        revalidatePath('/super-admin/tenants')
        return { success: true }
    } catch (error) {
        console.error("Create Tenant Failed", error)
        return { success: false, error: "Erreur lors de la création" }
    }
}

export async function updateTenantCompliance(formData: FormData) {
    const session = await auth()
    if (!session || session.user.role !== 'super_admin') throw new Error('Non autorisé')

    const tenantId = formData.get('tenantId') as string
    const name = formData.get('name') as string
    const primaryColor = formData.get('primaryColor') as string

    // Compliance Fields
    const siret = formData.get('siret') as string
    const address = formData.get('address') as string
    const ndaNumber = formData.get('ndaNumber') as string
    const uaiCode = formData.get('uaiCode') as string
    const legalRep = formData.get('legalRep') as string
    const contactEmail = formData.get('contactEmail') as string
    const contactPhone = formData.get('contactPhone') as string
    const website = formData.get('website') as string
    const qualiopiCert = formData.get('qualiopiCert') === 'true'

    // File Handling
    const logoFile = formData.get('logo') as File | null
    let logoUrl = undefined

    if (logoFile && logoFile.size > 0) {
        try {
            const buffer = Buffer.from(await logoFile.arrayBuffer())
            const filename = `tenant-${tenantId}-${Date.now()}-${logoFile.name.replace(/\s/g, '_')}`

            // Ensure directory exists
            const uploadDir = path.join(process.cwd(), 'public/uploads/tenants')
            await fs.mkdir(uploadDir, { recursive: true })

            const filepath = path.join(uploadDir, filename)
            await fs.writeFile(filepath, buffer)

            logoUrl = `/uploads/tenants/${filename}`
        } catch (error) {
            console.error("Logo upload failed", error)
            // Continue without updating logo if failed
        }
    }

    await db.tenant.update({
        where: { id: tenantId },
        data: {
            name,
            primaryColor,
            ...(logoUrl && { logoUrl }), // Only update if new logo uploaded
            siret,
            address,
            ndaNumber,
            uaiCode,
            legalRep,
            contactEmail,
            contactPhone,
            website,
            qualiopiCert
        }
    })

    await logAuditEvent('SUPER_ADMIN_UPDATE_TENANT_COMPLIANCE', 'Tenant', tenantId, {
        adminId: session.user.id
    })

    revalidatePath('/super-admin/tenants')
    return { success: true }
}



export async function getPlatformSettings() {
    const session = await auth()
    if (!session || session.user.role !== 'super_admin') throw new Error('Non autorisé')

    // Ensure defaults exist
    await initializeDefaultConfig()

    const settings = await db.platformConfig.findMany({
        orderBy: { key: 'asc' }
    })

    // Mask secrets
    return settings.map(s => ({
        ...s,
        value: s.isSecret ? '********' : s.value
    }))
}

export async function savePlatformConfig(key: string, value: string, group: string = 'GENERAL', isSecret: boolean = false) {
    const session = await auth()
    if (!session || session.user.role !== 'super_admin') throw new Error('Non autorisé')

    // If it's a secret and value is masked, don't update it
    if (isSecret && value === '********') {
        return { success: true }
    }

    await db.platformConfig.upsert({
        where: { key },
        update: { value, group, isSecret },
        create: { key, value, group, isSecret }
    })

    await logAuditEvent('SUPER_ADMIN_UPDATE_CONFIG', 'PlatformConfig', key, {
        adminId: session.user.id,
        updated: true
    })

    revalidatePath('/super-admin/config')
    return { success: true }
}

export async function deletePlatformConfig(key: string) {
    const session = await auth()
    if (!session || session.user?.role !== 'super_admin') throw new Error('Non autorisé')

    await db.platformConfig.delete({
        where: { key }
    })

    await logAuditEvent('SUPER_ADMIN_DELETE_CONFIG', 'PlatformConfig', key, {
        adminId: session.user.id
    })

    revalidatePath('/super-admin/config')
    return { success: true }
}

async function initializeDefaultConfig() {
    const defaults = [
        { key: "platform_name", value: "Alternance 360", group: "BRANDING" },
        { key: "support_email", value: "support@alternance360.com", group: "BRANDING" },
        { key: "maintenance_mode", value: "false", group: "SECURITY" },
        { key: "self_registration", value: "false", group: "SECURITY" },
        { key: "audit_verbose", value: "false", group: "TECH" },
        // AI Integration
        { key: "openai_api_key", value: "", group: "IA", isSecret: true },
        { key: "anthropic_api_key", value: "", group: "IA", isSecret: true },
        { key: "gemini_api_key", value: "", group: "IA", isSecret: true },
        // SMTP Advanced
        { key: "smtp_host", value: "smtp.sendgrid.net", group: "TECH", isSecret: true },
        { key: "smtp_user", value: "apikey", group: "TECH", isSecret: true },
        { key: "smtp_pass", value: "", group: "TECH", isSecret: true },
        { key: "smtp_port", value: "587", group: "TECH", isSecret: false },
        { key: "smtp_from_name", value: "Alternance 360", group: "TECH", isSecret: false },
        { key: "smtp_from_email", value: "noreply@alternance360.com", group: "TECH", isSecret: false },
    ]

    for (const def of defaults) {
        const exists = await db.platformConfig.findUnique({ where: { key: def.key } })
        if (!exists) {
            await db.platformConfig.create({
                data: {
                    key: def.key,
                    value: def.value,
                    group: def.group || 'GENERAL',
                    isSecret: def.isSecret || false
                }
            })
        }
    }
}
