// Badge system rules and evaluation
export interface Badge {
    id: string;
    name: string;
    icon: string;
    description: string;
    type: 'achievement' | 'streak' | 'temporal' | 'elite' | 'contextual';
    requirement: (engagement: UserEngagement, checkins?: any[]) => boolean;
}

export interface UserEngagement {
    current_streak: number;
    longest_streak: number;
    total_checkins: number;
    last_checkin: string | null;
    badges: UnlockedBadge[];
}

export interface UnlockedBadge {
    id: string;
    name: string;
    icon: string;
    description: string;
    unlocked_at: string;
}

// Badge definitions
export const BADGE_RULES: Badge[] = [
    {
        id: 'first_checkin',
        name: 'Primeiro Check-in',
        icon: '🔥',
        description: 'Realize seu primeiro check-in',
        type: 'achievement',
        requirement: (engagement) => engagement.total_checkins >= 1
    },
    {
        id: 'streak_3',
        name: 'Streak 3 Dias',
        icon: '🔥',
        description: 'Mantenha uma sequência de 3 dias',
        type: 'streak',
        requirement: (engagement) => engagement.current_streak >= 3
    },
    {
        id: 'streak_7',
        name: 'Streak 7 Dias',
        icon: '🔥',
        description: 'Mantenha uma sequência de 7 dias',
        type: 'streak',
        requirement: (engagement) => engagement.current_streak >= 7
    },
    {
        id: 'weekly_frequency',
        name: 'Frequência Semanal',
        icon: '🏅',
        description: 'Faça 3 check-ins em 7 dias',
        type: 'temporal',
        requirement: (engagement, checkins) => {
            if (!checkins) return false;
            const last7Days = checkins.filter((c: any) => {
                const date = new Date(c.date);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return date >= weekAgo;
            });
            const totalCheckins = last7Days.reduce((sum: number, day: any) => sum + day.count, 0);
            return totalCheckins >= 3;
        }
    },
    {
        id: 'dedicated_athlete',
        name: 'Atleta Dedicado',
        icon: '🏆',
        description: 'Mantenha uma sequência de 30 dias',
        type: 'elite',
        requirement: (engagement) => engagement.current_streak >= 30
    },
    {
        id: 'gold_member',
        name: 'Membro Ouro',
        icon: '💎',
        description: 'Complete 50 check-ins totais',
        type: 'elite',
        requirement: (engagement) => engagement.total_checkins >= 50
    },
    {
        id: 'academy_champion',
        name: 'Campeão da Academia',
        icon: '🎖️',
        description: 'Seja o mais frequente da semana',
        type: 'contextual',
        requirement: () => false // Implementar lógica de ranking
    }
];

// Evaluate which badges should be unlocked
export function evaluateBadges(
    engagement: UserEngagement,
    checkins?: any[]
): Badge[] {
    const unlockedBadgeIds = new Set(engagement.badges.map(b => b.id));

    return BADGE_RULES.filter(badge => {
        // Skip if already unlocked
        if (unlockedBadgeIds.has(badge.id)) return false;

        // Check if requirement is met
        return badge.requirement(engagement, checkins);
    });
}

// Get all badges with unlock status
export function getAllBadgesWithStatus(engagement: UserEngagement): Array<Badge & { unlocked: boolean; unlocked_at?: string }> {
    const unlockedBadgeMap = new Map(
        engagement.badges.map(b => [b.id, b.unlocked_at])
    );

    return BADGE_RULES.map(badge => ({
        ...badge,
        unlocked: unlockedBadgeMap.has(badge.id),
        unlocked_at: unlockedBadgeMap.get(badge.id)
    }));
}
