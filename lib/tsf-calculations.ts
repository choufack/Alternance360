/**
 * lib/tsf-calculations.ts
 *
 * Fonctions METIER PURES (aucun accès base de données, aucun effet de bord)
 * utilisées par le module TSF (Tableau de Suivi de Formation).
 *
 * Objectif : isoler les règles de calcul de progression pédagogique du code
 * d'accès aux données (Prisma/Supabase) afin de pouvoir les couvrir par des
 * tests unitaires rapides, déterministes et indépendants de toute base de
 * données (cf. dossier Bloc 2 - section "Harnais de tests unitaires").
 */

export type IndicatorStatus = "ACQUIS" | "PENDING" | "IN_PROGRESS"

export interface IndicatorEvaluation {
    status: IndicatorStatus
}

export interface IndicatorWithEvaluations {
    id: string
    evaluations: IndicatorEvaluation[]
}

export interface CompetenceWithIndicators {
    id: string
    indicateurs: IndicatorWithEvaluations[]
}

export interface BlocWithCompetences {
    id: string
    title: string
    competences: CompetenceWithIndicators[]
}

export interface BlocProgress {
    blockId: string
    blockTitle: string
    percentage: number
    stats: {
        total: number
        acquired: number
    }
}

/**
 * Calcule un taux de progression (0-100, arrondi à l'entier le plus proche)
 * à partir du nombre d'indicateurs validés et du nombre total d'indicateurs.
 *
 * Règles :
 * - Si `total` est 0 (référentiel vide / non encore configuré), retourne 0
 *   plutôt qu'une division par zéro (NaN).
 * - `acquired` est toujours borné à `[0, total]` pour éviter un pourcentage
 *   supérieur à 100 en cas d'incohérence de données.
 */
export function calculateProgress(total: number, acquired: number): number {
    if (total <= 0) return 0
    const safeAcquired = Math.min(Math.max(acquired, 0), total)
    return Math.round((safeAcquired / total) * 100)
}

/**
 * Détermine si un indicateur est considéré "acquis" pour un contrat donné :
 * au moins une évaluation avec le statut ACQUIS.
 */
export function isIndicatorAcquired(indicateur: IndicatorWithEvaluations): boolean {
    return indicateur.evaluations.some((e) => e.status === "ACQUIS")
}

/**
 * Calcule la progression détaillée par bloc de compétences (utilisé par le
 * tableau de bord apprenti/tuteur/formateur). Équivalent pur de la logique
 * historiquement inline dans `app/actions/tsf.ts::getContractProgress`.
 */
export function calculateBlocsProgress(blocs: BlocWithCompetences[]): BlocProgress[] {
    return blocs.map((bloc) => {
        const allIndicators = bloc.competences.flatMap((c) => c.indicateurs)
        const total = allIndicators.length
        const acquired = allIndicators.filter(isIndicatorAcquired).length

        return {
            blockId: bloc.id,
            blockTitle: bloc.title,
            percentage: calculateProgress(total, acquired),
            stats: { total, acquired },
        }
    })
}

/**
 * Calcule la progression globale (tous blocs confondus) à partir de la
 * progression détaillée par bloc. Utile pour l'indicateur de synthèse affiché
 * en haut du tableau de suivi (TSF).
 */
export function calculateGlobalProgress(blocs: BlocWithCompetences[]): number {
    const detail = calculateBlocsProgress(blocs)
    const total = detail.reduce((sum, b) => sum + b.stats.total, 0)
    const acquired = detail.reduce((sum, b) => sum + b.stats.acquired, 0)
    return calculateProgress(total, acquired)
}
