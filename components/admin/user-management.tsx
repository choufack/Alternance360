'use client'

import { useState, useMemo } from 'react'
import { createUser, deleteUser } from '@/app/admin/actions'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Trash2, UserPlus, Mail, Building2, UserCircle2, ShieldCheck, GraduationCap, Briefcase, Search } from 'lucide-react'

type User = {
    id: string
    email: string
    fullName: string | null
    role: string
    companyName: string | null
    created_at: string
}

export function UserManagement({ users }: { users: User[] }) {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [role, setRole] = useState('apprentice')
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')

    const filteredUsers = useMemo(() => {
        if (!search.trim()) return users
        const q = search.toLowerCase()
        return users.filter(u =>
            (u.fullName?.toLowerCase().includes(q)) ||
            u.email.toLowerCase().includes(q) ||
            u.role.toLowerCase().includes(q)
        )
    }, [users, search])

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setError('')
        const res = await createUser(formData)
        setLoading(false)
        if (res.error) {
            setError(res.error)
        } else {
            setIsOpen(false)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Supprimer cet utilisateur ?')) return
        await deleteUser(id)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3 flex-1">
                    <h2 className="text-lg font-bold whitespace-nowrap">Liste des Utilisateurs</h2>
                    <div className="relative flex-1 max-w-sm">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Rechercher par nom, email, rôle..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 h-9 text-sm rounded-xl border-slate-200"
                        />
                    </div>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 text-white gap-2">
                            <UserPlus size={16} /> Nouvel Utilisateur
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Créer un compte</DialogTitle>
                        </DialogHeader>
                        <form action={handleSubmit} className="space-y-4">
                            {error && <p className="text-red-500 text-sm">{error}</p>}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Prénom</Label>
                                    <Input name="firstName" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nom</Label>
                                    <Input name="lastName" required />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input name="email" type="email" required />
                            </div>
                            <div className="space-y-2">
                                <Label>Mot de passe</Label>
                                <Input name="password" type="password" required />
                            </div>
                            <div className="space-y-2">
                                <Label>Rôle</Label>
                                <Select name="role" value={role} onValueChange={setRole}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="apprentice">Apprenti</SelectItem>
                                        <SelectItem value="tutor">Tuteur Entreprise</SelectItem>
                                        <SelectItem value="formateur">Formateur / Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {role === 'tutor' && (
                                <div className="space-y-2">
                                    <Label>Entreprise</Label>
                                    <Input name="companyName" placeholder="Nom de l'entreprise" />
                                </div>
                            )}

                            {role === 'apprentice' && (
                                <div className="space-y-2">
                                    <Label>Nom du Tuteur (Optionnel)</Label>
                                    <Input name="tutorName" placeholder="Pour référence" />
                                </div>
                            )}

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Création...' : 'Créer'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                            <th className="p-6">Utilisateur</th>
                            <th className="p-6">Rôle</th>
                            <th className="p-6">Détails</th>
                            <th className="p-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-20 text-center text-slate-400">
                                    {search ? `Aucun résultat pour "${search}"` : 'Aucun utilisateur trouvé.'}
                                </td>
                            </tr>
                        ) : filteredUsers.map(user => (
                            <tr key={user.id} className="group hover:bg-slate-50/50 transition-colors">
                                <td className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                                            <UserCircle2 size={20} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900">{user.fullName}</div>
                                            <div className="text-slate-500 text-xs flex items-center gap-1">
                                                <Mail size={12} /> {user.email}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6">
                                    {user.role === 'admin' && <Badge className="bg-rose-50 text-rose-700 border-rose-100 gap-1"><ShieldCheck size={12} /> Administrateur</Badge>}
                                    {user.role === 'super_admin' && <Badge className="bg-amber-50 text-amber-700 border-amber-100 gap-1"><ShieldCheck size={12} /> Super Admin</Badge>}
                                    {user.role === 'formateur' && <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 gap-1"><Briefcase size={12} /> Formateur</Badge>}
                                    {user.role === 'tutor' && <Badge className="bg-blue-50 text-blue-700 border-blue-100 gap-1"><Building2 size={12} /> Tuteur</Badge>}
                                    {user.role === 'apprentice' && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 gap-1"><GraduationCap size={12} /> Apprenti</Badge>}
                                </td>
                                <td className="p-6 text-slate-500 font-medium italic">
                                    {user.companyName || (user.role === 'apprentice' ? 'Scolarité standard' : '-')}
                                </td>
                                <td className="p-6 text-right flex justify-end gap-2">
                                    <Link href={`/admin/users/${user.id}`}>
                                        <Button variant="ghost" size="sm" className="h-10 px-4 rounded-xl text-blue-600 hover:bg-blue-50 font-bold transition-all">
                                            Détails
                                        </Button>
                                    </Link>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(user.id)} className="w-10 h-10 p-0 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all">
                                        <Trash2 size={16} />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
