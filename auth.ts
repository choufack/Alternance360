import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "@/lib/db"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut, update } = NextAuth({
    adapter: PrismaAdapter(prisma) as any,
    session: { strategy: "jwt" },
    providers: [
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                console.log(" [AUTH] Authorize attempt:", credentials?.email)
                if (!credentials?.email || !credentials?.password) return null

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string },
                    include: { tenant: true, customRole: true }
                })

                if (!user || !user.password) {
                    console.log(" [AUTH] User not found or no password:", credentials?.email)
                    return null
                }

                const isValid = await bcrypt.compare(credentials.password as string, user.password)

                if (!isValid) {
                    console.log(" [AUTH] Invalid password for:", credentials?.email)
                    return null
                }

                console.log(" [AUTH] Login success for:", user.email, "Role:", user.role)

                return {
                    id: user.id,
                    email: user.email,
                    name: user.fullName,
                    role: user.role,
                    tenantId: user.tenantId,
                    customRole: user.customRole
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.role = (user as any).role
                token.tenantId = (user as any).tenantId
                token.customRole = (user as any).customRole
            }

            // Handle session updates (impersonation start/stop)
            if (trigger === "update" && session) {
                token.role = session.user?.role ?? token.role
                token.tenantId = session.user?.tenantId ?? token.tenantId
                token.isImpersonating = session.isImpersonating ?? token.isImpersonating
                token.originalUserId = session.originalUserId ?? token.originalUserId
                // Update sub to target user ID if impersonating
                if (session.user?.id) {
                    token.sub = session.user.id
                }
            }

            return token
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.sub as string
                session.user.role = token.role as string
                session.user.tenantId = token.tenantId as string
                session.user.customRole = token.customRole

                // Impersonation data
                if (token.isImpersonating) {
                    session.user.isImpersonating = true
                    session.user.originalUserId = token.originalUserId as string
                }
            }
            return session
        },
    },
    pages: {
        signIn: "/login",
    },
}) as any
