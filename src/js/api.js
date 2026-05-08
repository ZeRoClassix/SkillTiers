/**
 * api.js - UI-facing data adapter for MCTiers v2.
 *
 * Normal leaderboard views are paged/lazy-loaded from the API so the browser
 * does not download the full 125k+ player list on startup.
 */

import {
  applyPlayerOverrides,
  buildPlayerFromApi,
  createEmptyPlayer,
  enforceUniqueHt1Players,
  gamemodes,
  playerOverrides,
} from './players.js';

const API_BASE_URL = 'https://mctiers.com/api/v2';
const REQUEST_TIMEOUT_MS = 30000;
const MAX_FETCH_ATTEMPTS = 4;
const EMPTY_UUID = '00000000-0000-0000-0000-000000000000';
const API_PAGE_SIZE = 50;

const profileCache = new Map();
const profileRequestCache = new Map();
const pointRankCache = new Map();

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
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
      const error = new Error(`${response.status} ${response.statusText}`);
      error.status = response.status;
      throw error;
    }

    return await response.json();
  } catch (error) {
    if (error.status === 404) {
      throw error;
    }

    if (attempt >= MAX_FETCH_ATTEMPTS) {
      throw new Error(`${label} failed after ${attempt} attempts: ${error.message}`);
    }

    const waitMs = attempt * 500;
    await sleep(waitMs);
    return fetchJson(url, label, attempt + 1);
  }
}

function normalizeLookupValue(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeRank(value) {
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

function createEmptyGamemodeGroups() {
  return { "1": [], "2": [], "3": [], "4": [], "5": [] };
}

function createPagedRequests(count, from = 0) {
  const safeCount = Math.max(0, Number(count) || 0);
  const safeFrom = Math.max(0, Number(from) || 0);
  const requests = [];

  for (let offset = 0; offset < safeCount; offset += API_PAGE_SIZE) {
    requests.push({
      count: Math.min(API_PAGE_SIZE, safeCount - offset),
      from: safeFrom + offset,
    });
  }

  return requests;
}

function overrideMatchesPlayers(override, players) {
  const overrideUuid = normalizeLookupValue(override.uuid);
  const overrideUsername = normalizeLookupValue(override.username);

  return players.some((player) => {
    const uuid = normalizeLookupValue(player.uuid);
    const username = normalizeLookupValue(player.username);
    return (overrideUuid && uuid === overrideUuid) || (overrideUsername && username === overrideUsername);
  });
}

function samePlayer(left, right) {
  const leftUuid = normalizeLookupValue(left?.uuid);
  const rightUuid = normalizeLookupValue(right?.uuid);
  const leftName = normalizeLookupValue(left?.username || left?.name);
  const rightName = normalizeLookupValue(right?.username || right?.name);

  return Boolean(
    (leftUuid && leftUuid === rightUuid)
    || (leftName && leftName === rightName),
  );
}

function playerKey(player) {
  const uuid = normalizeLookupValue(player?.uuid);
  const username = normalizeLookupValue(player?.username || player?.name);
  return uuid || username;
}

function pointsValue(player) {
  const points = Number(player?.points);
  return Number.isFinite(points) ? points : 0;
}

function playerNeedsPointRank(player) {
  return Boolean(
    player?.needsPointRank
    || playerOverrides.some((override) => samePlayer(override, player)),
  );
}

function isNewOverride(override) {
  if (!override || typeof override !== 'object') {
    return false;
  }

  const overrideUuid = normalizeLookupValue(override.uuid);
  const overrideUsername = normalizeLookupValue(override.username);
  if (!overrideUuid && !overrideUsername) {
    return false;
  }

  return !profileCache.has(overrideUuid) && !profileCache.has(overrideUsername);
}

function overrideRankIsInRange(override, from, count) {
  const rank = normalizeRank(override.rank);
  return rank !== null && rank >= from + 1 && rank <= from + count;
}

function createPlayerFromOverride(override) {
  return applyPlayerOverrides([], [override])[0] || createEmptyPlayer();
}

async function createPlayerFromOverrideLive(override) {
  const name = override?.username;
  if (typeof name !== 'string' || !name.trim()) {
    return createPlayerFromOverride(override);
  }

  try {
    const profile = await fetchJson(
      buildUrl(`profile/by-name/${encodeURIComponent(name)}`),
      `override profile ${name}`,
    );
    const basePlayer = buildPlayerFromApi(profile, profile.overall);
    const [mergedPlayer] = applyPlayerOverrides([basePlayer], [override], { appendNew: false });
    return mergedPlayer || createPlayerFromOverride(override);
  } catch (error) {
    if (error.status === 404 || error.message.includes('404')) {
      return createPlayerFromOverride(override);
    }

    throw error;
  }
}

async function getOverridePlayersNotSeen(seenKeys) {
  const players = await Promise.all(playerOverrides.map(createPlayerFromOverrideLive));
  return players.filter((player) => {
    const key = playerKey(player);
    return key && !seenKeys.has(key);
  });
}

function createRankingsFromTiers(playerTiers) {
  const rankings = {};

  for (const [slug, data] of Object.entries(playerTiers || {})) {
    if (!data) continue;

    const rankValue = data.current || data.peak;
    if (!rankValue) continue;

    const tierString = typeof rankValue === 'number'
      ? `HT${rankValue}`
      : rankValue.toUpperCase();

    let state = 'current';
    if (!data.current && data.peak) {
      state = 'peak';
    }
    if (data.retired === true) {
      state = 'retired';
    }

    rankings[slug] = {
      tier: tierString,
      state,
      current: data.current,
      peak: data.peak,
      retired: data.retired,
    };
  }

  return rankings;
}

function toRenderedPlayer(player) {
  return {
    uuid: player.uuid || EMPTY_UUID,
    username: player.username,
    name: player.username,
    region: player.region,
    points: player.points,
    rank: player.rank,
    tiers: player.tiers,
    rankings: createRankingsFromTiers(player.tiers),
  };
}

function cachePlayer(player) {
  if (!player) return;

  const uuid = normalizeLookupValue(player.uuid);
  const username = normalizeLookupValue(player.username);
  if (uuid) profileCache.set(uuid, player);
  if (username) profileCache.set(username, player);
}

function cachePlayers(players) {
  players.forEach(cachePlayer);
}

async function fetchProfilePlayerByName(name) {
  const normalizedName = normalizeLookupValue(name);
  if (!normalizedName) return null;

  const cached = profileCache.get(normalizedName);
  if (cached && !cached.partialProfile) {
    return cached;
  }

  if (profileRequestCache.has(normalizedName)) {
    return profileRequestCache.get(normalizedName);
  }

  const override = playerOverrides.find((player) => normalizeLookupValue(player.username) === normalizedName);
  const request = fetchJson(
    buildUrl(`profile/by-name/${encodeURIComponent(name)}`),
    `profile ${name}`,
  )
    .then((profile) => {
      const basePlayer = buildPlayerFromApi(profile, profile.overall);
      const [mergedPlayer] = applyPlayerOverrides([basePlayer], playerOverrides, { appendNew: false });
      const [normalizedPlayer] = enforceUniqueHt1Players([mergedPlayer], playerOverrides);
      return applyPointRanks([normalizedPlayer]).then(([rankedPlayer]) => {
        cachePlayer(rankedPlayer);
        return rankedPlayer;
      });
    })
    .catch((error) => {
      if (override) {
        const [overridePlayer] = enforceUniqueHt1Players([createPlayerFromOverride(override)], playerOverrides);
        return applyPointRanks([overridePlayer]).then(([rankedOverridePlayer]) => {
          cachePlayer(rankedOverridePlayer);
          return rankedOverridePlayer;
        });
      }

      if (error.status === 404 || error.message.includes('404')) {
        return null;
      }

      throw error;
    })
    .finally(() => {
      profileRequestCache.delete(normalizedName);
    });

  profileRequestCache.set(normalizedName, request);
  return request;
}

function sortPlayersByRank(players) {
  return [...players].sort((a, b) => {
    const rankA = Number.isFinite(a.rank) ? a.rank : Number.POSITIVE_INFINITY;
    const rankB = Number.isFinite(b.rank) ? b.rank : Number.POSITIVE_INFINITY;
    if (rankA !== rankB) return rankA - rankB;
    if (a.points !== b.points) return b.points - a.points;
    return a.username.localeCompare(b.username, 'en', { sensitivity: 'base' });
  });
}

async function resolvePointRank(player) {
  const targetPoints = pointsValue(player);
  const cacheKey = `${playerKey(player)}:${targetPoints}`;
  if (pointRankCache.has(cacheKey)) {
    return pointRankCache.get(cacheKey);
  }

  let greaterPointsCount = 0;
  let from = 0;
  const seenKeys = new Set();

  while (true) {
    const page = await fetchJson(
      buildUrl('mode/overall', { count: API_PAGE_SIZE, from }),
      `overall rank scan from=${from}`,
    );
    const apiPlayers = Array.isArray(page) ? page : [];
    if (!apiPlayers.length) {
      break;
    }

    const basePlayers = apiPlayers.map((source, index) => buildPlayerFromApi(source, from + index + 1));
    const normalizedPlayers = enforceUniqueHt1Players(
      applyPlayerOverrides(basePlayers, playerOverrides, { appendNew: false }),
      playerOverrides,
    );

    for (const candidate of normalizedPlayers) {
      const key = playerKey(candidate);
      if (key) seenKeys.add(key);
      if (!samePlayer(candidate, player) && pointsValue(candidate) > targetPoints) {
        greaterPointsCount += 1;
      }
    }

    const lastRawPoints = pointsValue(apiPlayers[apiPlayers.length - 1]);
    if (apiPlayers.length < API_PAGE_SIZE || lastRawPoints < targetPoints) {
      break;
    }

    from += API_PAGE_SIZE;
  }

  const extraOverridePlayers = enforceUniqueHt1Players(await getOverridePlayersNotSeen(seenKeys), playerOverrides);
  for (const overridePlayer of extraOverridePlayers) {
    if (!samePlayer(overridePlayer, player) && pointsValue(overridePlayer) > targetPoints) {
      greaterPointsCount += 1;
    }
  }

  const rank = greaterPointsCount + 1;
  pointRankCache.set(cacheKey, rank);
  return rank;
}

async function applyPointRanks(players) {
  await Promise.all(players.map(async (player) => {
    if (!playerNeedsPointRank(player)) {
      return;
    }

    player.rank = await resolvePointRank(player);
  }));

  return players;
}

function getTierString(tierNumber, pos) {
  if (!Number.isInteger(tierNumber) || !Number.isInteger(pos)) {
    return null;
  }

  if (tierNumber < 1 || tierNumber > 5 || (pos !== 0 && pos !== 1)) {
    return null;
  }

  return `${pos === 0 ? 'HT' : 'LT'}${tierNumber}`;
}

function toGamemodeRow(player, gamemode, tierString, options = {}) {
  const { partialProfile = true } = options;
  const modeTier = player.tiers?.[gamemode] || {};
  const displayedTier = tierString || modeTier.current || modeTier.peak;
  const normalizedTier = typeof displayedTier === 'string' ? displayedTier.toUpperCase() : null;
  if (!normalizedTier) return null;

  const tierNum = parseInt(normalizedTier.slice(-1), 10);
  if (tierNum < 1 || tierNum > 5) return null;

  let state = 'current';
  if (!modeTier.current && modeTier.peak) {
    state = 'peak';
  }
  if (modeTier.retired === true) {
    state = 'retired';
  }

  return {
    ...toRenderedPlayer(player),
    partialProfile,
    tier: normalizedTier,
    isHT: normalizedTier.startsWith('HT'),
    state,
    current: modeTier.current || normalizedTier,
    peak: modeTier.peak || normalizedTier,
    retired: modeTier.retired,
  };
}

function sortGamemodeTierRows(grouped) {
  for (const tierKey in grouped) {
    grouped[tierKey].sort((a, b) => {
      if (a.isHT !== b.isHT) return a.isHT ? -1 : 1;
      return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
    });
  }

  return grouped;
}

function rebuildGamemodeGroups(rows, gamemode) {
  const grouped = { "1": [], "2": [], "3": [], "4": [], "5": [] };

  for (const row of rows) {
    const nextRow = toGamemodeRow(row, gamemode, undefined, {
      partialProfile: row.partialProfile,
    });

    if (!nextRow || nextRow.state === 'retired') {
      continue;
    }

    const tierNum = parseInt(nextRow.tier.slice(-1), 10);
    if (tierNum >= 1 && tierNum <= 5) {
      grouped[String(tierNum)].push(nextRow);
    }
  }

  return sortGamemodeTierRows(grouped);
}

// ---- API Emulation ----

export async function fetchGamemodes() {
  return gamemodes;
}

export function getGamemodeImage(slug) {
  return null;
}

export function getTabIconPath(slug) {
  return `./tabs/${slug}.svg`;
}

export async function fetchOverall(count = 50, from = 0) {
  const requests = createPagedRequests(count, from);
  const pages = await Promise.all(requests.map(({ count: pageCount, from: pageFrom }) => {
    return fetchJson(
      buildUrl('mode/overall', { count: pageCount, from: pageFrom }),
      `overall page from=${pageFrom}`,
    );
  }));
  const apiPlayers = pages.flatMap((page) => (Array.isArray(page) ? page : []));
  const rankOffset = from + 1;
  const basePlayers = apiPlayers.map((player, index) => buildPlayerFromApi(player, rankOffset + index));
  const replacedPlayers = applyPlayerOverrides(basePlayers, playerOverrides, { appendNew: false });
  const overridePlayers = from === 0
    ? await Promise.all(playerOverrides.map(createPlayerFromOverrideLive))
    : await Promise.all(playerOverrides
      .filter((override) => (
        isNewOverride(override)
        && !overrideMatchesPlayers(override, basePlayers)
        && overrideRankIsInRange(override, from, count)
      ))
      .map(createPlayerFromOverrideLive));
  const withoutDuplicates = replacedPlayers.filter((player) => !overrideMatchesPlayers(player, overridePlayers));
  const finalPlayers = enforceUniqueHt1Players([...withoutDuplicates, ...overridePlayers], playerOverrides);
  await applyPointRanks(finalPlayers);
  const sortedPlayers = sortPlayersByRank(finalPlayers);

  cachePlayers(sortedPlayers);
  return (from === 0 ? sortedPlayers : sortedPlayers.slice(0, count)).map(toRenderedPlayer);
}

export async function fetchGamemodeRankings(gamemode, count = 50, from = 0) {
  const grouped = createEmptyGamemodeGroups();
  const requests = createPagedRequests(count, from);
  const responses = await Promise.all(requests.map(({ count: pageCount, from: pageFrom }) => {
    return fetchJson(
      buildUrl(`mode/${gamemode}`, { count: pageCount, from: pageFrom }),
      `${gamemode} rankings from=${pageFrom}`,
    );
  }));

  for (const response of responses) {
    for (let tier = 1; tier <= 5; tier += 1) {
      const tierKey = String(tier);
      const tierPlayers = Array.isArray(response?.[tierKey]) ? response[tierKey] : [];
      grouped[tierKey].push(...tierPlayers);
    }
  }

  for (let tier = 1; tier <= 5; tier += 1) {
    const tierPlayers = grouped[String(tier)];
    grouped[String(tier)] = [];

    for (const source of tierPlayers) {
      const basePlayer = buildPlayerFromApi({
        ...source,
        points: 0,
        rankings: {
          [gamemode]: {
            tier,
            pos: source.pos,
            peak_tier: tier,
            peak_pos: source.pos,
            retired: false,
          },
        },
      }, null);
      const [mergedPlayer] = applyPlayerOverrides([basePlayer], playerOverrides, { appendNew: false });
      const tierString = getTierString(tier, source.pos);
      const row = toGamemodeRow(mergedPlayer, gamemode, tierString, { partialProfile: true });
      if (row && row.state !== 'retired') {
        grouped[String(tier)].push(row);
      }
    }
  }

  if (from === 0) {
    for (const override of playerOverrides) {
      const overridePlayer = await createPlayerFromOverrideLive(override);
      const row = toGamemodeRow(overridePlayer, gamemode, undefined, { partialProfile: false });
      if (!row || row.state === 'retired') continue;

      const tierNum = parseInt(row.tier.slice(-1), 10);
      if (tierNum >= 1 && tierNum <= 5) {
        for (const tierKey in grouped) {
          grouped[tierKey] = grouped[tierKey].filter((player) => {
            const sameUuid = normalizeLookupValue(player.uuid) === normalizeLookupValue(row.uuid);
            const sameName = normalizeLookupValue(player.name) === normalizeLookupValue(row.name);
            return !sameUuid && !sameName;
          });
        }
        grouped[String(tierNum)].push(row);
      }
    }
  }

  const rows = Object.values(grouped).flat();
  enforceUniqueHt1Players(rows, playerOverrides);
  await applyPointRanks(rows.filter((row) => !row.partialProfile));
  return rebuildGamemodeGroups(rows, gamemode);
}

export async function fetchPlayerByName(name) {
  const player = await fetchProfilePlayerByName(name);
  return player ? toRenderedPlayer(player) : null;
}

export async function fetchPlayerOverallRank(name) {
  const player = await fetchPlayerByName(name);
  if (!player) return null;

  return {
    rank: player.rank ?? 999999,
    player,
  };
}

export function avatarUrl(uuid, size = 64, username = '') {
  if (uuid && uuid !== EMPTY_UUID && uuid.length > 10) {
    const cleanUuid = uuid.replace(/-/g, '');
    return `https://visage.surgeplay.com/bust/${size}/${cleanUuid}.png`;
  }

  if (username) {
    return `https://visage.surgeplay.com/bust/${size}/${username}.png`;
  }

  return `https://visage.surgeplay.com/bust/${size}/MHF_Steve.png`;
}

export function headUrl(uuid, size = 64, username = '') {
  if (uuid && uuid !== EMPTY_UUID && uuid.length > 10) {
    const cleanUuid = uuid.replace(/-/g, '');
    return `https://visage.surgeplay.com/face/${size}/${cleanUuid}.png`;
  }

  if (username) {
    return `https://visage.surgeplay.com/face/${size}/${username}.png`;
  }

  return `https://visage.surgeplay.com/face/${size}/MHF_Steve.png`;
}

export function skinUrl(uuid, username = '') {
  if (uuid && uuid !== EMPTY_UUID && uuid.length > 10) {
    const cleanUuid = uuid.replace(/-/g, '');
    return `https://visage.surgeplay.com/full/256/${cleanUuid}.png`;
  }

  if (username) {
    return `https://visage.surgeplay.com/full/256/${username}.png`;
  }

  return 'https://visage.surgeplay.com/full/256/MHF_Steve.png';
}
