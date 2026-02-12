import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { AdminSidebar } from "@/components/admin/sidebar"
import { SuperAdminSidebar } from "@/components/super-admin/sidebar"

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    // Super admins get their own sidebar when visiting /admin pages
    const isSuperAdmin = session.user.role === "super_admin"

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {isSuperAdmin ? <SuperAdminSidebar /> : <AdminSidebar role={session.user.role} />}
            <main className="flex-1 overflow-y-auto p-12 lg:p-16">
                {children}
            </main>
        </div>
    )
}
