const API_BASE_URL = 'https://mctiers.com/api/v2';
const PAGE_SIZE = 50;
const OVERALL_PAGE_CONCURRENCY = 6;

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

const OVERRIDES_FILE = new URL('./src/js/players.override.js', import.meta.url);

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

function formatTierFromNumbers(tier, pos) {
  if (!Number.isInteger(tier) || !Number.isInteger(pos)) {
    return null;
  }

  if (tier < 1 || tier > 5 || (pos !== 0 && pos !== 1)) {
    return null;
  }

  return `${pos === 0 ? 'HT' : 'LT'}${tier}`;
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

function normalizeRegion(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return 'NA';
  }

  return value.trim().toUpperCase();
}

function normalizeNumber(value, fallback = null) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function createEmptyTier() {
  return {
    current: null,
    peak: null,
    retired: null,
  };
}

function createEmptyPlayer() {
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

function buildPlayerFromApi(source, rank) {
  const player = createEmptyPlayer();
  const rankings = isRecord(source.rankings) ? source.rankings : {};

  player.username = typeof source.name === 'string' ? source.name : '';
  player.uuid = typeof source.uuid === 'string' ? source.uuid : '';
  player.rank = normalizeNumber(rank ?? source.overall);
  player.points = normalizeNumber(source.points, 0);
  player.region = normalizeRegion(source.region);

  for (const mode of API_GAMEMODES) {
    player.tiers[mode] = normalizeRanking(rankings[mode]);
  }

  return player;
}

function mergeOverrideTier(baseTier, overrideTier) {
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

function mergeOverridePlayer(basePlayer, overridePlayer) {
  const merged = createEmptyPlayer();
  const source = isRecord(overridePlayer) ? overridePlayer : {};
  const sourceTiers = isRecord(source.tiers) ? source.tiers : {};

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

  for (const mode of PLAYER_TIER_KEYS) {
    merged.tiers[mode] = mergeOverrideTier(basePlayer.tiers[mode], sourceTiers[mode]);
  }

  return merged;
}

async function fetchJson(url, label, attempt = 1) {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (attempt >= 4) {
      throw new Error(`${label} failed after ${attempt} attempts: ${error.message}`);
    }

    const waitMs = attempt * 750;
    console.warn(`${label} failed (${error.message}). Retrying in ${waitMs}ms...`);
    await sleep(waitMs);
    return fetchJson(url, label, attempt + 1);
  }
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

async function fetchOverallPage(from) {
  const url = buildUrl('mode/overall', { count: PAGE_SIZE, from });
  return fetchJson(url, `overall page from=${from}`);
}

async function fetchAllOverallPlayers() {
  const players = [];
  let from = 0;
  let completedBatches = 0;

  while (true) {
    const offsets = Array.from(
      { length: OVERALL_PAGE_CONCURRENCY },
      (_, index) => from + (index * PAGE_SIZE),
    );

    const pages = await Promise.all(offsets.map((offset) => fetchOverallPage(offset)));
    let reachedEnd = false;

    for (let index = 0; index < pages.length; index += 1) {
      const page = pages[index];

      if (!Array.isArray(page) || page.length === 0) {
        reachedEnd = true;
        break;
      }

      players.push(...page);

      if (page.length < PAGE_SIZE) {
        reachedEnd = true;
        break;
      }
    }

    completedBatches += 1;
    console.log(`Fetched overall batch ${completedBatches} (${players.length} players so far)`);

    if (reachedEnd) {
      break;
    }

    from += OVERALL_PAGE_CONCURRENCY * PAGE_SIZE;
  }

  return players;
}

async function loadOverrides() {
  const moduleUrl = `${OVERRIDES_FILE.href}?cacheBust=${Date.now()}`;
  const overrideModule = await import(moduleUrl);

  if (!Array.isArray(overrideModule.players)) {
    return [];
  }

  return overrideModule.players;
}

function applyOverrides(players, overridePlayers) {
  const output = [...players];

  for (const overridePlayer of overridePlayers) {
    const isValidOverride = isRecord(overridePlayer);
    if (!isValidOverride) {
      continue;
    }

    const overrideUuid = typeof overridePlayer.uuid === 'string'
      ? overridePlayer.uuid.trim()
      : '';
    const overrideName = typeof overridePlayer.username === 'string'
      ? overridePlayer.username.trim().toLowerCase()
      : '';

    let index = -1;

    if (overrideUuid) {
      index = output.findIndex((player) => player.uuid === overrideUuid);
    }

    if (index === -1 && overrideName) {
      index = output.findIndex((player) => player.username.toLowerCase() === overrideName);
    }

    if (index === -1) {
      output.push(mergeOverridePlayer(createEmptyPlayer(), overridePlayer));
      continue;
    }

    output[index] = mergeOverridePlayer(output[index], overridePlayer);
  }

  return output;
}

function sortPlayers(players) {
  return [...players].sort((left, right) => {
    const leftRank = Number.isFinite(left.rank) ? left.rank : Number.POSITIVE_INFINITY;
    const rightRank = Number.isFinite(right.rank) ? right.rank : Number.POSITIVE_INFINITY;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    if (left.points !== right.points) {
      return right.points - left.points;
    }

    return left.username.localeCompare(right.username, 'en', {
      sensitivity: 'base',
    });
  });
}

async function main() {
  console.log('Verifying live player loading from MCTiers API v2...');
  const overallPlayers = await fetchAllOverallPlayers();
  console.log(`Fetched ${overallPlayers.length} overall players`);

  const transformedPlayers = overallPlayers.map((player, index) => buildPlayerFromApi(player, index + 1));

  const overrides = await loadOverrides();
  console.log(`Loaded ${overrides.length} player overrides`);

  const finalPlayers = sortPlayers(
    applyOverrides(transformedPlayers, overrides),
  );

  console.log(`Merged ${finalPlayers.length} live players with overrides`);
  console.log('No files were written. src/js/players.js fetches players at runtime now.');
}

main().catch((error) => {
  console.error('Failed to verify players:', error);
  process.exitCode = 1;
});
