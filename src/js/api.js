/**
 * api.js – API fetching with local fallback & Mojang UUID resolution
 * --------------------------------------------------------
 */

import { players as localPlayers, gamemodes, tierRanks } from './players.js';

// ---- Configuration ----
const API_BASE_URL = 'https://mctiers.com/api';
const USE_API = false; // Set to false to always use local data

// ---- UUID resolution & caching ----
const UUID_CACHE_KEY = 'mctiers_uuid_cache';

function getUUIDCache() {
  try {
    const raw = localStorage.getItem(UUID_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveUUIDCache(cache) {
  try {
    localStorage.setItem(UUID_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Failed to save UUIDs to localStorage:', e);
  }
}

// Convert 32-char UUID to 36-char with dashes
function formatUuid(raw) {
  if (!raw || raw.length !== 32) return raw;
  return `${raw.slice(0,8)}-${raw.slice(8,12)}-${raw.slice(12,16)}-${raw.slice(16,20)}-${raw.slice(20)}`;
}

export async function resolveUUIDs(players) {
  const cache = getUUIDCache();
  const missing = [];

  // Update from cache immediately
  players.forEach(p => {
    if (!p.uuid && cache[p.username]) {
      p.uuid = cache[p.username];
    } else if (!p.uuid) {
      missing.push(p);
    }
  });

  if (missing.length === 0) return players;

  // Mojang API restricts to 10 names per bulk request
  const CHUNK_SIZE = 10;
  for (let i = 0; i < missing.length; i += CHUNK_SIZE) {
    const chunk = missing.slice(i, i + CHUNK_SIZE);
    const names = chunk.map(p => p.username);

    try {
      const res = await fetch('https://api.mojang.com/profiles/minecraft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(names)
      });

      if (res.ok) {
        const data = await res.json();
        data.forEach(profile => {
          const dashedUuid = formatUuid(profile.id);
          cache[profile.name] = dashedUuid;
          const target = chunk.find(p => p.username.toLowerCase() === profile.name.toLowerCase());
          if (target) {
            target.uuid = dashedUuid;
          }
        });
      }
    } catch (err) {
      console.error('Failed to fetch UUIDs chunk:', err);
    }
  }

  saveUUIDCache(cache);
  return players;
}

// ---- API Fetching with Fallback ----

let cachedPlayers = null;
let apiFetchAttempted = false;

/**
 * Fetch all players from API, fallback to local data
 */
async function fetchAllPlayers() {
  // Return cached if available
  if (cachedPlayers) {
    return cachedPlayers;
  }

  // If API is disabled or already failed, use local data
  if (!USE_API || apiFetchAttempted) {
    const playersCopy = JSON.parse(JSON.stringify(localPlayers));
    cachedPlayers = await resolveUUIDs(playersCopy);
    return cachedPlayers;
  }

  // Try to fetch from API
  try {
    apiFetchAttempted = true;
    const response = await fetch(`${API_BASE_URL}/rankings/overall`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const apiData = await response.json();

    // Transform API data to our format
    const transformedPlayers = apiData.map((player, index) => ({
      username: player.name || player.username,
      uuid: player.uuid || '',
      points: player.points || player.rating || (1000 - index * 50),
      rank: player.rank || (index + 1),
      region: player.region || 'NA',
      tiers: transformApiTiers(player.tiers || player.rankings || {})
    }));

    // Resolve UUIDs for API players
    cachedPlayers = await resolveUUIDs(transformedPlayers);
    console.log('Loaded players from API:', cachedPlayers.length);
    return cachedPlayers;

  } catch (error) {
    console.warn('API fetch failed, using local data:', error.message);
    const playersCopy = JSON.parse(JSON.stringify(localPlayers));
    cachedPlayers = await resolveUUIDs(playersCopy);
    return cachedPlayers;
  }
}

/**
 * Transform API tier data to our format with current/peak/retired
 */
function transformApiTiers(apiTiers) {
  const tiers = {};
  const allGamemodes = ['overall', 'ltm', 'vanilla', 'uhc', 'pot', 'nethop', 'smp', 'sword', 'axe', 'mace'];

  for (const gm of allGamemodes) {
    const apiData = apiTiers[gm];

    if (apiData) {
      // Handle different API response formats
      if (typeof apiData === 'string') {
        // Simple string format: "HT1" or "LT2"
        tiers[gm] = {
          current: apiData,
          peak: apiData,
          retired: null
        };
      } else if (typeof apiData === 'object') {
        // Object format with current/peak/retired
        tiers[gm] = {
          current: apiData.current || apiData.rank || null,
          peak: apiData.peak || apiData.current || apiData.rank || null,
          retired: apiData.retired || null
        };
      }
    } else {
      // No data for this gamemode
      tiers[gm] = { current: null, peak: null, retired: null };
    }
  }

  return tiers;
}

// ---- API Emulation ----

export async function fetchGamemodes() {
  return gamemodes;
}

// Return null to use local SVGs from /tabs folder
export function getGamemodeImage(slug) {
  return null;
}

/**
 * Get local tab icon path
 */
export function getTabIconPath(slug) {
  return `./tabs/${slug}.svg`;
}

/**
 * Create rankings structure for rendering from player tiers
 */
function createRankingsFromTiers(playerTiers) {
  const rankings = {};

  for (const [slug, data] of Object.entries(playerTiers || {})) {
    if (!data) continue;

    // Use current tier as displayed tier
    const rankValue = data.current || data.peak;
    if (!rankValue) continue;

    // Convert numeric to string format if needed
    let tierString;
    if (typeof rankValue === 'number') {
      tierString = `HT${rankValue}`; // Default to HT for numeric values
    } else {
      tierString = rankValue.toUpperCase();
    }

    // Determine state based on which tier value we're showing
    let state = 'current';
    if (data.current && data.peak && data.current !== data.peak) {
      state = 'current'; // Has both, showing current
    } else if (!data.current && data.peak) {
      state = 'peak';
    }
    if (data.retired === true) {
      state = 'retired';
    }

    rankings[slug] = {
      tier: tierString,
      state: state,
      current: data.current,
      peak: data.peak,
      retired: data.retired
    };
  }

  return rankings;
}

/**
 * Fetch the Overall leaderboard.
 */
export async function fetchOverall(count = 50, from = 0) {
  const allPlayers = await fetchAllPlayers();

  // Sort by explicit rank parameter (ascending)
  const sorted = [...allPlayers].sort((a, b) => {
      const rankA = a.rank ?? 999999;
      const rankB = b.rank ?? 999999;
      return rankA - rankB;
  });

  // Format for renderOverallCards
  return sorted.slice(from, from + count).map((p, index) => ({
    uuid: p.uuid || '00000000-0000-0000-0000-000000000000',
    name: p.username,
    region: p.region,
    points: p.points,
    rankings: createRankingsFromTiers(p.tiers)
  }));
}

/**
 * Fetch rankings for a specific gamemode.
 * Returns: { "1": GamemodePlayer[], "2": [...], ... "5": [] }
 */
export async function fetchGamemodeRankings(gamemode, count = 50, from = 0) {
  const allPlayers = await fetchAllPlayers();
  // Group by tier number (1-5), with LT and HT combined in each
  const grouped = { "1": [], "2": [], "3": [], "4": [], "5": [] };

  allPlayers.forEach(p => {
    if (p.tiers && p.tiers[gamemode]) {
      const tierData = p.tiers[gamemode];
      // Skip retired tiers for gamemode tabs (only show on overall)
      if (tierData.retired === true) {
        return; // Skip this player
      }
      
      // Use current tier if available, otherwise peak
      const rankValue = tierData.current || tierData.peak;

      if (rankValue) {
        // Convert numeric to string format if needed
        let tierString;
        if (typeof rankValue === 'number') {
          tierString = `HT${rankValue}`; // Default to HT for numeric values
        } else {
          tierString = rankValue.toUpperCase();
        }

        // Extract tier number
        const tierNum = parseInt(tierString.slice(-1), 10) || 5;
        const isHT = tierString.startsWith('HT');

        // Determine state
        let state = 'current';
        if (!tierData.current && tierData.peak) state = 'peak';

        if (tierNum >= 1 && tierNum <= 5) {
          grouped[String(tierNum)].push({
            uuid: p.uuid || '00000000-0000-0000-0000-000000000000',
            name: p.username,
            region: p.region,
            tier: tierString,
            isHT: isHT,
            state: state,
            current: tierData.current,
            peak: tierData.peak,
            retired: tierData.retired
          });
        }
      }
    }
  });

  // Sort each tier group: HT (isHT=true) first, then LT (isHT=false), then alphabetically
  for (const tierKey in grouped) {
    grouped[tierKey].sort((a, b) => {
      // First by HT/LT (HT first)
      if (a.isHT !== b.isHT) return a.isHT ? -1 : 1;
      // Then alphabetically by name
      return a.name.localeCompare(b.name);
    });
  }

  return grouped;
}

export async function fetchPlayerByName(name) {
  const allPlayers = await fetchAllPlayers();
  const p = allPlayers.find(p => p.username.toLowerCase() === name.toLowerCase());

  if (!p) return null;

  return {
    uuid: p.uuid,
    name: p.username,
    region: p.region,
    points: p.points,
    rankings: createRankingsFromTiers(p.tiers)
  };
}

/**
 * Find a player's true overall rank (1-indexed) across ALL players, and return their data.
 * Returns { player, rank } or null if not found.
 */
export async function fetchPlayerOverallRank(name) {
  const allPlayers = await fetchAllPlayers();

  const p = allPlayers.find(p => p.username.toLowerCase() === name.toLowerCase());
  if (!p) return null;

  return {
    rank: p.rank ?? 999999,
    player: {
      uuid: p.uuid || '00000000-0000-0000-0000-000000000000',
      name: p.username,
      region: p.region,
      points: p.points,
      rankings: createRankingsFromTiers(p.tiers)
    }
  };
}

/**
 * Build reliable avatar URL for a given UUID or username.
 * Using visage.surgeplay.com for true 3D bust renders like MCTiers
 */
export function avatarUrl(uuid, size = 64, username = '') {
  // If we have a valid UUID, use it
  if (uuid && uuid !== '00000000-0000-0000-0000-000000000000' && uuid.length > 10) {
    const cleanUuid = uuid.replace(/-/g, '');
    // Full 3D bust render (head + shoulders) with transparency
    return `https://visage.surgeplay.com/bust/${size}/${cleanUuid}.png`;
  }

  // Fallback to username-based avatar
  if (username) {
    return `https://visage.surgeplay.com/bust/${size}/${username}.png`;
  }

  // Final fallback to default Steve avatar
  return `https://visage.surgeplay.com/bust/${size}/MHF_Steve.png`;
}

/**
 * Get face/head render URL for UUID or username
 */
export function headUrl(uuid, size = 64, username = '') {
  if (uuid && uuid !== '00000000-0000-0000-0000-000000000000' && uuid.length > 10) {
    const cleanUuid = uuid.replace(/-/g, '');
    return `https://visage.surgeplay.com/face/${size}/${cleanUuid}.png`;
  }

  if (username) {
    return `https://visage.surgeplay.com/face/${size}/${username}.png`;
  }

  return `https://visage.surgeplay.com/face/${size}/MHF_Steve.png`;
}

/**
 * Get full skin URL for UUID or username
 */
export function skinUrl(uuid, username = '') {
  if (uuid && uuid !== '00000000-0000-0000-0000-000000000000' && uuid.length > 10) {
    const cleanUuid = uuid.replace(/-/g, '');
    return `https://visage.surgeplay.com/full/256/${cleanUuid}.png`;
  }

  if (username) {
    return `https://visage.surgeplay.com/full/256/${username}.png`;
  }

  return 'https://visage.surgeplay.com/full/256/MHF_Steve.png';
}
