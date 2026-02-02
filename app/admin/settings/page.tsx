import { auth } from "@/auth"
import db from "@/lib/db"
import { redirect } from "next/navigation"
import { TenantSettingsForm } from "@/components/admin/settings/tenant-settings-form"
import { ApiKeyManagement } from "@/components/admin/settings/api-key-management"
import { WebhookSettings } from "@/components/admin/settings/webhook-settings"
import { AiSettingsForm } from "@/components/admin/settings/ai-settings-form"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Zap, Cpu } from "lucide-react"

export default async function SettingsPage() {
    const session = await auth()
    if (!session) redirect("/login")

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { tenantId: true, role: true }
    })

    if (!user || user.role !== "admin") {
        return <div className="p-8">Accès non autorisé</div>
    }

    const tenant = await db.tenant.findUnique({
        where: { id: user.tenantId! }
    })

    if (!tenant) return <div className="p-8">Organisme introuvable</div>

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Configuration</h1>
                <p className="text-slate-500">Gérez les informations et les intégrations de votre organisme de formation.</p>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="bg-slate-100 p-1.5 rounded-2xl mb-8 inline-flex gap-1">
                    <TabsTrigger value="general" className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all data-[state=active]:text-blue-600 text-slate-500">
                        Général
                    </TabsTrigger>
                    <TabsTrigger value="ia" className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all data-[state=active]:text-blue-600 text-slate-500 flex gap-2 items-center">
                        <Zap size={14} />
                        Intelligence Artificielle
                    </TabsTrigger>
                    <TabsTrigger value="integrations" className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all data-[state=active]:text-blue-600 text-slate-500">
                        Intégrations (API)
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                        <TenantSettingsForm tenant={tenant} />
                    </div>
                </TabsContent>

                <TabsContent value="ia">
                    <AiSettingsForm currentKey={process.env.GOOGLE_API_KEY} />
                </TabsContent>

                <TabsContent value="integrations">
                    <ApiKeyManagement />
                    <WebhookSettings />
                </TabsContent>
            </Tabs>
        </div>
    )
}
