import NextAuth, { DefaultSession } from "next-auth"
import { AdapterUser as BaseAdapterUser } from "@auth/core/adapters"

declare module "next-auth" {
    interface Session {
        user: {
            role: string
            tenantId: string | null
            customRole?: any
            isImpersonating?: boolean
            originalUserId?: string
        } & DefaultSession["user"]
    }

    interface User {
        id?: string
        role: string
        tenantId: string | null
        customRole?: any
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role: string
        tenantId: string | null
        customRole?: any
        isImpersonating?: boolean
        originalUserId?: string
    }
}

declare module "@auth/core/adapters" {
    interface AdapterUser extends BaseAdapterUser {
        role: string
        tenantId: string | null
        customRole?: any
    }
}
