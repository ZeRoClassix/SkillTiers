/**
 * Player overrides applied after loading live data from MCTiers.
 *
 * Keep each entry in the same structure as `src/js/players.js`.
 * Matching rules:
 * - `uuid` is matched first when present
 * - otherwise `username` is matched case-insensitively
 * - if no existing player matches, the override is added as a brand-new player
 *
 * For username changes, keep the player's current UUID in the override entry so
 * the runtime merge can still find and replace the right player.
 */

export const players = [
    /*
    {
        username: 'ExistingPlayerOrNewPlayer',
        uuid: '',
        rank: null,
        points: 0,
        region: 'NA',
        tiers: {
            overall: { current: null, peak: null, retired: null },
            ltm: { current: null, peak: null, retired: null },
            vanilla: { current: null, peak: null, retired: null },
            uhc: { current: null, peak: null, retired: null },
            pot: { current: null, peak: null, retired: null },
            nethop: { current: null, peak: null, retired: null },
            smp: { current: null, peak: null, retired: null },
            sword: { current: null, peak: null, retired: null },
            axe: { current: null, peak: null, retired: null },
            mace: { current: null, peak: null, retired: null },
        },
    },
    */
    {
        username: 'aidn',
        uuid: '34138ee7-b9c5-4f3b-ae10-9e84ff85856d',
        rank: 59,
        points: 97,
        region: 'EU',
        tiers: {
            overall: { current: null, peak: null, retired: false },
            ltm: { current: null, peak: null, retired: false },
            vanilla: { current: "LT1", peak: null, retired: false },
            uhc: { current: "HT3", peak: null, retired: false },
            pot: { current: "LT3", peak: null, retired: false },
            nethop: { current: "LT2", peak: null, retired: false },
            smp: { current: null, peak: null, retired: false },
            sword: { current: null, peak: null, retired: false },
            axe: { current: null, peak: null, retired: false },
            mace: { current: "LT3", peak: null, retired: false },
        },
    }
];

export const gamemodes = [
    'overall',
    'vanilla',
    'uhc',
    'pot',
    'nethop',
    'smp',
    'sword',
    'axe',
    'mace',
];

export const tierRanks = [
    'HT1',
    'LT1',
    'HT2',
    'LT2',
    'HT3',
    'LT3',
    'HT4',
    'LT4',
    'HT5',
    'LT5',
];
