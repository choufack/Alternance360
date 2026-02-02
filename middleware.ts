import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req: any) => {
    const { nextUrl } = req
    const isLoggedIn = !!req.auth
    const userRole = req.auth?.user?.role

    const isPublicRoute = nextUrl.pathname === "/" || nextUrl.pathname === "/login" || nextUrl.pathname === "/pricing"
    const isAuthRoute = nextUrl.pathname === "/login"

    const dashboardMap: Record<string, string> = {
        apprentice: "/apprentice",
        tutor: "/tutor",
        formateur: "/formateur",
        admin: "/admin",
        super_admin: "/super-admin/leads"
    }

    // 1. Redirect to login if not authenticated and trying to access private route
    if (!isLoggedIn && !isPublicRoute) {
        return NextResponse.redirect(new URL("/login", nextUrl))
    }

    // 2. Role-based Redirection logic
    if (isLoggedIn) {
        // Prevent access to login page if already logged in
        if (isAuthRoute) {
            if (!userRole) {
                return NextResponse.redirect(new URL("/login", nextUrl))
            }
            return NextResponse.redirect(new URL(dashboardMap[userRole] || "/unauthorized", nextUrl))
        }

        // Protection for Super-Admin routes
        if (nextUrl.pathname.startsWith("/super-admin") && userRole !== "super_admin") {
            return NextResponse.redirect(new URL("/unauthorized", nextUrl))
        }

        // Protection for Admin/Formateur routes
        if (nextUrl.pathname.startsWith("/admin") && !["admin", "super_admin", "formateur"].includes(userRole || "")) {
            return NextResponse.redirect(new URL("/unauthorized", nextUrl))
        }

        // Protection for Tutor routes
        if (nextUrl.pathname.startsWith("/tutor") && userRole !== "tutor") {
            return NextResponse.redirect(new URL("/unauthorized", nextUrl))
        }

        // Protection for Apprentice routes
        if (nextUrl.pathname.startsWith("/apprentice") && userRole !== "apprentice") {
            return NextResponse.redirect(new URL("/unauthorized", nextUrl))
        }
    }

    return NextResponse.next()
})

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
