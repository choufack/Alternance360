import { describe, it, expect } from 'vitest'
import {
    calculateProgress,
    isIndicatorAcquired,
    calculateBlocsProgress,
    calculateGlobalProgress,
    type BlocWithCompetences,
} from '../tsf-calculations'

describe('calculateProgress', () => {
    it('retourne 0 quand il n\'y a aucun indicateur (évite la division par zéro)', () => {
        expect(calculateProgress(0, 0)).toBe(0)
    })

    it('calcule un pourcentage arrondi à l\'entier le plus proche', () => {
        expect(calculateProgress(3, 1)).toBe(33) // 33.33 -> 33
        expect(calculateProgress(3, 2)).toBe(67) // 66.66 -> 67
    })

    it('retourne 100 quand tous les indicateurs sont acquis', () => {
        expect(calculateProgress(12, 12)).toBe(100)
    })

    it('borne le résultat à 100 même si "acquired" dépasse "total" (donnée incohérente)', () => {
        expect(calculateProgress(5, 8)).toBe(100)
    })

    it('ne retourne jamais un pourcentage négatif', () => {
        expect(calculateProgress(5, -3)).toBe(0)
    })
})

describe('isIndicatorAcquired', () => {
    it('retourne true si au moins une évaluation a le statut ACQUIS', () => {
        const indicateur = {
            id: 'ind-1',
            evaluations: [{ status: 'PENDING' as const }, { status: 'ACQUIS' as const }],
        }
        expect(isIndicatorAcquired(indicateur)).toBe(true)
    })

    it('retourne false si aucune évaluation ACQUIS n\'existe', () => {
        const indicateur = { id: 'ind-2', evaluations: [{ status: 'PENDING' as const }] }
        expect(isIndicatorAcquired(indicateur)).toBe(false)
    })

    it('retourne false si la liste d\'évaluations est vide', () => {
        const indicateur = { id: 'ind-3', evaluations: [] }
        expect(isIndicatorAcquired(indicateur)).toBe(false)
    })
})

function makeBloc(overrides: Partial<BlocWithCompetences> = {}): BlocWithCompetences {
    return {
        id: 'bloc-1',
        title: 'Bloc 2 - Concevoir et développer des applications logicielles',
        competences: [
            {
                id: 'comp-1',
                indicateurs: [
                    { id: 'ind-1', evaluations: [{ status: 'ACQUIS' }] },
                    { id: 'ind-2', evaluations: [{ status: 'PENDING' }] },
                    { id: 'ind-3', evaluations: [] },
                    { id: 'ind-4', evaluations: [{ status: 'ACQUIS' }] },
                ],
            },
        ],
        ...overrides,
    }
}

describe('calculateBlocsProgress', () => {
    it('calcule le nombre acquis/total et le pourcentage pour un bloc', () => {
        const result = calculateBlocsProgress([makeBloc()])
        expect(result).toHaveLength(1)
        expect(result[0]).toEqual({
            blockId: 'bloc-1',
            blockTitle: 'Bloc 2 - Concevoir et développer des applications logicielles',
            percentage: 50, // 2/4
            stats: { total: 4, acquired: 2 },
        })
    })

    it('agrège plusieurs compétences au sein d\'un même bloc', () => {
        const bloc = makeBloc({
            competences: [
                { id: 'c1', indicateurs: [{ id: 'i1', evaluations: [{ status: 'ACQUIS' }] }] },
                { id: 'c2', indicateurs: [{ id: 'i2', evaluations: [{ status: 'ACQUIS' }] }] },
                { id: 'c3', indicateurs: [{ id: 'i3', evaluations: [] }] },
            ],
        })
        const [result] = calculateBlocsProgress([bloc])
        expect(result.stats).toEqual({ total: 3, acquired: 2 })
        expect(result.percentage).toBe(67)
    })

    it('gère un référentiel sans indicateur sans planter (0%)', () => {
        const bloc = makeBloc({ competences: [] })
        const [result] = calculateBlocsProgress([bloc])
        expect(result.percentage).toBe(0)
        expect(result.stats).toEqual({ total: 0, acquired: 0 })
    })

    it('traite plusieurs blocs indépendamment', () => {
        const blocA = makeBloc({ id: 'A', title: 'Bloc A' })
        const blocB = makeBloc({
            id: 'B',
            title: 'Bloc B',
            competences: [{ id: 'c', indicateurs: [{ id: 'i', evaluations: [{ status: 'ACQUIS' }] }] }],
        })
        const result = calculateBlocsProgress([blocA, blocB])
        expect(result.map((r) => r.blockId)).toEqual(['A', 'B'])
        expect(result[1].percentage).toBe(100)
    })
})

describe('calculateGlobalProgress', () => {
    it('calcule la progression globale toutes compétences confondues', () => {
        const blocA = makeBloc({ id: 'A' }) // 2/4 acquis
        const blocB = makeBloc({
            id: 'B',
            competences: [
                { id: 'c', indicateurs: [{ id: 'i1', evaluations: [{ status: 'ACQUIS' }] }, { id: 'i2', evaluations: [] }] },
            ],
        }) // 1/2 acquis
        // Total = 4 + 2 = 6, acquis = 2 + 1 = 3 -> 50%
        expect(calculateGlobalProgress([blocA, blocB])).toBe(50)
    })

    it('retourne 0 pour un référentiel entièrement vide', () => {
        expect(calculateGlobalProgress([])).toBe(0)
    })
})
