'use client'

import { Search } from "lucide-react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

export function ReferentielSearch() {
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const { replace } = useRouter()
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q')?.toString() || "")

    useEffect(() => {
        const handler = setTimeout(() => {
            const params = new URLSearchParams(searchParams)
            const currentQ = params.get('q') || ""

            if (currentQ !== searchTerm) {
                if (searchTerm) {
                    params.set('q', searchTerm)
                } else {
                    params.delete('q')
                }
                replace(`${pathname}?${params.toString()}`, { scroll: false })
            }
        }, 300)

        return () => {
            clearTimeout(handler)
        }
    }, [searchTerm, pathname, replace, searchParams])

    return (
        <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
                type="text"
                placeholder="Rechercher un code RNCP, un titre..."
                className="w-full h-14 pl-12 pr-4 bg-white border border-slate-100 rounded-2xl font-medium focus:outline-none focus:ring-4 focus:ring-indigo-600/5 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
    )
}
