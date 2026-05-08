/**
 * Runtime player data for the leaderboard.
 *
 * The full MCTiers player list is fetched from the public v2 API at runtime.
 * Only custom overrides should live in `players.override.js`.
 */

const overrideModule = await import(`./players.override.js?updated=${Date.now()}`);
const overridePlayers = Array.isArray(overrideModule.players) ? overrideModule.players : [];

const API_BASE_URL = 'https://mctiers.com/api/v2';
const PAGE_SIZE = 50;
const OVERALL_PAGE_CONCURRENCY = 6;
const REQUEST_TIMEOUT_MS = 30000;
const MAX_FETCH_ATTEMPTS = 4;

const PLAYER_TIER_KEYS = [
    'overall',
    'ltm',
    'vanilla',
    'uhc',
    'pot',
    'nethop',
    'smp',
    'sword',
    'axe',
    'mace',
];

const API_GAMEMODES = [
    'vanilla',
    'uhc',
    'pot',
    'nethop',
    'smp',
    'sword',
    'axe',
    'mace',
];

// Compatibility export: this intentionally contains only manual overrides.
// Use getPlayers() for the full live API-backed player list.
export const players = overridePlayers;
export const playerOverrides = overridePlayers;

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

export const tierPoints = {
    HT1: 60,
    LT1: 45,
    HT2: 30,
    LT2: 20,
    HT3: 10,
    LT3: 6,
    HT4: 4,
    LT4: 3,
    HT5: 2,
    LT5: 1,
};

let cachedPlayers = null;
let playersPromise = null;

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function hasOwn(target, key) {
    return Object.prototype.hasOwnProperty.call(target, key);
}

function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clonePlayers(list) {
    return JSON.parse(JSON.stringify(list));
}

function normalizeUuid(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeUsername(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeNumber(value, fallback = null) {
    if (value === null || value === undefined || value === '') {
        return fallback;
    }

    const next = Number(value);
    return Number.isFinite(next) ? next : fallback;
}

function normalizeRegion(value) {
    if (typeof value !== 'string' || !value.trim()) {
        return 'NA';
    }

    return value.trim().toUpperCase();
}

function normalizeTierLabel(value) {
    if (value === null || value === undefined) {
        return null;
    }

    const text = String(value).trim();
    if (!text || text.toLowerCase() === 'null') {
        return null;
    }

    return text.toUpperCase();
}

function isValidTierLabel(value) {
    return typeof value === 'string' && hasOwn(tierPoints, value.toUpperCase());
}

function normalizeRetiredFlag(value) {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
        if (normalized === 'null') return null;
    }

    return Boolean(value);
}

function formatTierFromNumbers(tier, pos) {
    if (!Number.isInteger(tier) || !Number.isInteger(pos)) {
        return null;
    }

    if (tier < 1 || tier > 5 || (pos !== 0 && pos !== 1)) {
        return null;
    }

    return `${pos === 0 ? 'HT' : 'LT'}${tier}`;
}

function createEmptyTier() {
    return {
        current: null,
        peak: null,
        retired: null,
    };
}

export function createEmptyPlayer() {
    const tiers = {};

    for (const mode of PLAYER_TIER_KEYS) {
        tiers[mode] = createEmptyTier();
    }

    return {
        username: '',
        uuid: '',
        rank: null,
        points: 0,
        region: 'NA',
        tiers,
    };
}

export function calculatePlayerPoints(player) {
    if (!isRecord(player?.tiers)) {
        return 0;
    }

    return Object.entries(player.tiers).reduce((total, [mode, tier]) => {
        if (mode === 'overall' || !isRecord(tier) || tier.retired === true) {
            return total;
        }

        const current = normalizeTierLabel(tier.current);
        return total + (isValidTierLabel(current) ? tierPoints[current] : 0);
    }, 0);
}

function recalculatePlayerPoints(player) {
    player.points = calculatePlayerPoints(player);
    return player;
}

function normalizeRanking(ranking) {
    if (!isRecord(ranking)) {
        return createEmptyTier();
    }

    const retired = normalizeRetiredFlag(ranking.retired);
    const current = formatTierFromNumbers(ranking.tier, ranking.pos);
    const peak = formatTierFromNumbers(ranking.peak_tier, ranking.peak_pos) ?? current;

    return {
        current: retired === true ? null : current,
        peak,
        retired,
    };
}

export function buildPlayerFromApi(source, rank) {
    const player = createEmptyPlayer();
    const rankings = isRecord(source.rankings) ? source.rankings : {};

    player.username = typeof source.name === 'string' ? source.name : '';
    player.uuid = typeof source.uuid === 'string' ? source.uuid : '';
    player.rank = normalizeNumber(source.overall, normalizeNumber(rank));
    player.points = normalizeNumber(source.points, 0);
    player.region = normalizeRegion(source.region);

    for (const mode of API_GAMEMODES) {
        player.tiers[mode] = normalizeRanking(rankings[mode]);
    }

    return player;
}

function mergeOverrideTier(baseTier = createEmptyTier(), overrideTier) {
    const merged = {
        current: baseTier.current,
        peak: baseTier.peak,
        retired: baseTier.retired,
    };

    if (isRecord(overrideTier)) {
        if (hasOwn(overrideTier, 'current')) {
            merged.current = normalizeTierLabel(overrideTier.current);
        }

        if (hasOwn(overrideTier, 'peak')) {
            merged.peak = normalizeTierLabel(overrideTier.peak);
        }

        if (hasOwn(overrideTier, 'retired')) {
            merged.retired = normalizeRetiredFlag(overrideTier.retired);
        }
    }

    if (merged.retired === true) {
        merged.current = null;
    }

    if (merged.peak === null && merged.current !== null) {
        merged.peak = merged.current;
    }

    return merged;
}

function tierPointValue(tier) {
    if (!isRecord(tier) || tier.retired === true) {
        return 0;
    }

    const current = normalizeTierLabel(tier.current);
    return isValidTierLabel(current) ? tierPoints[current] : 0;
}

function hasPlayerData(player) {
    return Boolean(
        normalizeUuid(player?.uuid)
        || normalizeUsername(player?.username)
        || Number.isFinite(player?.rank)
        || normalizeNumber(player?.points, 0) > 0
        || Object.values(player?.tiers || {}).some((tier) => tierPointValue(tier) > 0),
    );
}

function overrideTierChangesPoints(overrideTier) {
    return isRecord(overrideTier)
        && (hasOwn(overrideTier, 'current') || hasOwn(overrideTier, 'retired'));
}

function mergeOverridePlayer(basePlayer, overridePlayer) {
    const merged = createEmptyPlayer();
    const source = isRecord(overridePlayer) ? overridePlayer : {};
    const sourceTiers = isRecord(source.tiers) ? source.tiers : {};
    const hasBasePlayer = hasPlayerData(basePlayer);

    merged.username = hasOwn(source, 'username')
        ? String(source.username ?? '').trim()
        : basePlayer.username;
    merged.uuid = hasOwn(source, 'uuid')
        ? String(source.uuid ?? '').trim()
        : basePlayer.uuid;
    merged.rank = hasOwn(source, 'rank')
        ? normalizeNumber(source.rank)
        : basePlayer.rank;
    merged.points = hasOwn(source, 'points')
        ? normalizeNumber(source.points, 0)
        : basePlayer.points;
    merged.region = hasOwn(source, 'region')
        ? normalizeRegion(source.region)
        : basePlayer.region;
    merged.needsPointRank = true;

    for (const mode of PLAYER_TIER_KEYS) {
        merged.tiers[mode] = mergeOverrideTier(basePlayer.tiers[mode], sourceTiers[mode]);
    }

    if (!hasBasePlayer) {
        if (hasOwn(source, 'points')) {
            merged.points = normalizeNumber(source.points, 0);
            return merged;
        }

        return recalculatePlayerPoints(merged);
    }

    if (hasOwn(source, 'points')) {
        merged.points = normalizeNumber(source.points, basePlayer.points);
        return merged;
    }

    let nextPoints = normalizeNumber(basePlayer.points, 0);
    for (const mode of PLAYER_TIER_KEYS) {
        if (mode === 'overall' || !overrideTierChangesPoints(sourceTiers[mode])) {
            continue;
        }

        nextPoints += tierPointValue(merged.tiers[mode]) - tierPointValue(basePlayer.tiers[mode]);
    }

    merged.points = Math.max(0, nextPoints);
    return merged;
}

function getPlayerIdentity(player) {
    return {
        uuid: normalizeUuid(player?.uuid),
        username: normalizeUsername(player?.username),
    };
}

function samePlayer(left, right) {
    const leftIdentity = getPlayerIdentity(left);
    const rightIdentity = getPlayerIdentity(right);

    return Boolean(
        (leftIdentity.uuid && leftIdentity.uuid === rightIdentity.uuid)
        || (leftIdentity.username && leftIdentity.username === rightIdentity.username),
    );
}

function sortHt1Candidates(left, right) {
    const leftIsOverride = left.isOverride ? 1 : 0;
    const rightIsOverride = right.isOverride ? 1 : 0;
    if (leftIsOverride !== rightIsOverride) return rightIsOverride - leftIsOverride;

    const leftRank = Number.isFinite(left.player.rank) ? left.player.rank : Number.POSITIVE_INFINITY;
    const rightRank = Number.isFinite(right.player.rank) ? right.player.rank : Number.POSITIVE_INFINITY;
    if (leftRank !== rightRank) return leftRank - rightRank;

    if (left.player.points !== right.player.points) return right.player.points - left.player.points;

    return String(left.player.username || '').localeCompare(String(right.player.username || ''), 'en', {
        sensitivity: 'base',
    });
}

function demoteHt1Tier(player, tier) {
    const previousPoints = normalizeNumber(player.points, 0);
    tier.current = 'LT1';
    if (!tier.peak) {
        tier.peak = 'HT1';
    }

    player.points = Math.max(0, previousPoints + tierPoints.LT1 - tierPoints.HT1);
    player.needsPointRank = true;
}

export function enforceUniqueHt1Players(players, overrides = overridePlayers) {
    for (const mode of API_GAMEMODES) {
        const overrideHt1Players = overrides
            .filter((override) => normalizeTierLabel(override?.tiers?.[mode]?.current) === 'HT1')
            .map((override) => mergeOverridePlayer(createEmptyPlayer(), override));

        if (overrideHt1Players.length) {
            const winner = overrideHt1Players[0];

            for (const player of players) {
                const tier = player?.tiers?.[mode];
                if (normalizeTierLabel(tier?.current) !== 'HT1' || samePlayer(player, winner)) {
                    continue;
                }

                demoteHt1Tier(player, tier);
            }

            continue;
        }

        const candidates = players
            .filter((player) => normalizeTierLabel(player?.tiers?.[mode]?.current) === 'HT1')
            .map((player) => ({ player, isOverride: false }))
            .sort(sortHt1Candidates);

        const winner = candidates[0]?.player;
        if (!winner) continue;

        for (const candidate of candidates) {
            if (samePlayer(candidate.player, winner)) {
                continue;
            }

            demoteHt1Tier(candidate.player, candidate.player.tiers[mode]);
        }
    }

    return players;
}

export function applyPlayerOverrides(apiPlayers, overrides = overridePlayers, options = {}) {
    const { appendNew = true } = options;
    const output = [...apiPlayers];

    for (const overridePlayer of overrides) {
        if (!isRecord(overridePlayer)) {
            continue;
        }

        const overrideUuid = normalizeUuid(overridePlayer.uuid);
        const overrideName = normalizeUsername(overridePlayer.username);
        let index = -1;

        if (overrideUuid) {
            index = output.findIndex((player) => normalizeUuid(player.uuid) === overrideUuid);
        }

        if (index === -1 && overrideName) {
            index = output.findIndex((player) => normalizeUsername(player.username) === overrideName);
        }

        if (index === -1) {
            if (appendNew) {
                output.push(mergeOverridePlayer(createEmptyPlayer(), overridePlayer));
            }
            continue;
        }

        output[index] = mergeOverridePlayer(output[index], overridePlayer);
    }

    return output;
}

function sortPlayers(list) {
    return [...list].sort((left, right) => {
        if (left.points !== right.points) {
            return right.points - left.points;
        }

        const leftRank = Number.isFinite(left.rank) ? left.rank : Number.POSITIVE_INFINITY;
        const rightRank = Number.isFinite(right.rank) ? right.rank : Number.POSITIVE_INFINITY;

        if (leftRank !== rightRank) {
            return leftRank - rightRank;
        }

        return left.username.localeCompare(right.username, 'en', {
            sensitivity: 'base',
        });
    });
}

function assignPointRanks(players) {
    return sortPlayers(players).map((player, index) => {
        player.rank = index + 1;
        return player;
    });
}

function buildUrl(pathname, params = {}) {
    const url = new URL(pathname, `${API_BASE_URL}/`);

    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
            url.searchParams.set(key, String(value));
        }
    }

    return url.toString();
}

function getTimeoutSignal() {
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
        return AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    }

    return undefined;
}

async function fetchJson(url, label, attempt = 1) {
    try {
        const response = await fetch(url, {
            headers: {
                Accept: 'application/json',
            },
            signal: getTimeoutSignal(),
        });

        if (!response.ok) {
            throw new Error(`${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        if (attempt >= MAX_FETCH_ATTEMPTS) {
            throw new Error(`${label} failed after ${attempt} attempts: ${error.message}`);
        }

        const waitMs = attempt * 750;
        console.warn(`${label} failed (${error.message}). Retrying in ${waitMs}ms...`);
        await sleep(waitMs);
        return fetchJson(url, label, attempt + 1);
    }
}

async function fetchOverallPage(from) {
    const url = buildUrl('mode/overall', { count: PAGE_SIZE, from });
    const page = await fetchJson(url, `overall page from=${from}`);
    return Array.isArray(page) ? page : [];
}

async function fetchAllOverallPlayers({ onProgress } = {}) {
    const apiPlayers = [];
    let from = 0;
    let batch = 0;

    while (true) {
        const offsets = Array.from(
            { length: OVERALL_PAGE_CONCURRENCY },
            (_, index) => from + (index * PAGE_SIZE),
        );
        const pages = await Promise.all(offsets.map((offset) => fetchOverallPage(offset)));
        let reachedEnd = false;

        for (const page of pages) {
            if (!page.length) {
                reachedEnd = true;
                break;
            }

            apiPlayers.push(...page);

            if (page.length < PAGE_SIZE) {
                reachedEnd = true;
                break;
            }
        }

        batch += 1;
        if (typeof onProgress === 'function') {
            onProgress({ count: apiPlayers.length, batch });
        }

        if (reachedEnd) {
            break;
        }

        from += OVERALL_PAGE_CONCURRENCY * PAGE_SIZE;
    }

    return apiPlayers;
}

async function loadPlayersFromApi(options = {}) {
    const apiPlayers = await fetchAllOverallPlayers(options);
    const transformedPlayers = apiPlayers.map((player, index) => buildPlayerFromApi(player, index + 1));

    return assignPointRanks(
        enforceUniqueHt1Players(applyPlayerOverrides(transformedPlayers, overridePlayers), overridePlayers),
    );
}

export async function getPlayers({ forceRefresh = false, onProgress } = {}) {
    if (!forceRefresh && cachedPlayers) {
        return clonePlayers(cachedPlayers);
    }

    if (!forceRefresh && playersPromise) {
        return clonePlayers(await playersPromise);
    }

    playersPromise = loadPlayersFromApi({ onProgress });

    try {
        cachedPlayers = await playersPromise;
        return clonePlayers(cachedPlayers);
    } finally {
        playersPromise = null;
    }
}

export function getCachedPlayers() {
    return cachedPlayers ? clonePlayers(cachedPlayers) : null;
}
