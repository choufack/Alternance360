import { describe, it, expect } from 'vitest'
import { hasPermission, requirePermission, PERMISSIONS } from '../permissions'

describe('hasPermission', () => {
    it('refuse tout accès si aucun utilisateur n\'est fourni', () => {
        expect(hasPermission(null, 'TSF_VALIDATE')).toBe(false)
    })

    it('accorde tous les droits à un super_admin', () => {
        const user = { role: 'super_admin' }
        expect(hasPermission(user, 'TSF_UNLOCK')).toBe(true)
        expect(hasPermission(user, 'AUDIT_GENERATE')).toBe(true)
    })

    it('accorde tous les droits à un admin (legacy)', () => {
        const user = { role: 'admin' }
        expect(hasPermission(user, 'ROLE_MANAGE')).toBe(true)
    })

    it('limite un formateur à la lecture du TSF et des contrats', () => {
        const user = { role: 'formateur' }
        expect(hasPermission(user, 'TSF_READ')).toBe(true)
        expect(hasPermission(user, 'CONTRACT_READ')).toBe(true)
        expect(hasPermission(user, 'TSF_VALIDATE')).toBe(false)
        expect(hasPermission(user, 'USER_WRITE')).toBe(false)
    })

    it('accorde un droit custom présent dans customRole.permissions (JSON)', () => {
        const user = {
            role: 'apprentice',
            customRole: { permissions: JSON.stringify(['TSF_READ']) },
        }
        expect(hasPermission(user, 'TSF_READ')).toBe(true)
        expect(hasPermission(user, 'TSF_VALIDATE')).toBe(false)
    })

    it('refuse l\'accès si le JSON de customRole.permissions est invalide (fail-safe)', () => {
        const user = { role: 'apprentice', customRole: { permissions: '{not-json' } }
        expect(hasPermission(user, 'TSF_READ')).toBe(false)
    })

    it('refuse par défaut un rôle standard sans permission explicite (deny by default)', () => {
        const user = { role: 'apprentice' }
        expect(hasPermission(user, 'AUDIT_READ')).toBe(false)
    })
})

describe('requirePermission', () => {
    it('ne lève pas d\'exception si la permission est accordée', () => {
        const user = { role: 'super_admin' }
        expect(() => requirePermission(user, 'AUDIT_GENERATE')).not.toThrow()
    })

    it('lève une exception explicite si la permission est refusée', () => {
        const user = { role: 'apprentice' }
        expect(() => requirePermission(user, 'ROLE_MANAGE')).toThrow('Access Denied: Missing permission ROLE_MANAGE')
    })
})

describe('PERMISSIONS', () => {
    it('expose des clés et valeurs identiques (constantes stables, pas de faute de frappe)', () => {
        for (const [key, value] of Object.entries(PERMISSIONS)) {
            expect(key).toBe(value)
        }
    })
})
