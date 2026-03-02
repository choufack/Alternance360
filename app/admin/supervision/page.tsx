import { redirect } from "next/navigation"

// /admin/supervision is now merged into /admin (Tableau de Bord)
export default function AdminSupervisionRedirectPage() {
    redirect("/admin")
}
