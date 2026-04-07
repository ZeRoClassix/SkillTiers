import fs from 'fs';

const gamemodes = ['overall', 'ltm', 'vanilla', 'uhc', 'pot', 'nethop', 'smp', 'sword', 'axe', 'mace'];

function formatTier(tier) {
  if (!tier) return null;
  if (typeof tier !== 'string') return null;
  
  const match = tier.toString().match(/(high|low)_tier_(\d+)/i);
  if (match) {
    const prefix = match[1].toLowerCase() === 'high' ? 'HT' : 'LT';
    return `${prefix}${match[2]}`;
  }
  
  if (/^[HL]T\d$/.test(tier)) {
    return tier;
  }
  
  return tier;
}

function convertTier(tierData) {
  if (!tierData) {
    return { current: null, peak: null, retired: null };
  }
  
  if (typeof tierData === 'string') {
    const formatted = formatTier(tierData);
    return { current: formatted, peak: formatted, retired: null };
  }
  
  return {
    current: formatTier(tierData.current || tierData.tier || null),
    peak: formatTier(tierData.peak || tierData.best || tierData.current || tierData.tier || null),
    retired: formatTier(tierData.retired || null)
  };
}

function formatValue(value) {
  if (value === null || value === undefined) {
    return 'null';
  }
  return `"${value}"`;
}

async function fetchPlayers() {
  try {
    console.log('Fetching from MCTiers API...');
    
    const response = await fetch('https://mctiers.com/api/v2/overall?limit=500');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const apiPlayers = await response.json();
    console.log(`Fetched ${apiPlayers.length} players`);
    
    const players = apiPlayers.map((player, index) => {
      const rank = index + 1;
      
      const tiers = {};
      gamemodes.forEach(mode => {
        const apiTier = player[mode] || player.tiers?.[mode];
        tiers[mode] = convertTier(apiTier);
      });
      
      return {
        username: player.name || player.username,
        uuid: "",
        points: player.points || 0,
        rank: rank,
        region: player.region || "NA",
        tiers: tiers
      };
    });
    
    const fileContent = `/**
 * Complete player data with all gamemode tiers
 * Each tier includes: current, peak, and retired (if applicable)
 */

export const players = [
${players.map(p => `  {
    username: "${p.username}",
    uuid: "${p.uuid}",
    points: ${p.points},
    rank: ${p.rank},
    region: "${p.region}",
    tiers: {
      overall: { current: ${formatValue(p.tiers.overall.current)}, peak: ${formatValue(p.tiers.overall.peak)}, retired: ${formatValue(p.tiers.overall.retired)} },
      ltm: { current: ${formatValue(p.tiers.ltm.current)}, peak: ${formatValue(p.tiers.ltm.peak)}, retired: ${formatValue(p.tiers.ltm.retired)} },
      vanilla: { current: ${formatValue(p.tiers.vanilla.current)}, peak: ${formatValue(p.tiers.vanilla.peak)}, retired: ${formatValue(p.tiers.vanilla.retired)} },
      uhc: { current: ${formatValue(p.tiers.uhc.current)}, peak: ${formatValue(p.tiers.uhc.peak)}, retired: ${formatValue(p.tiers.uhc.retired)} },
      pot: { current: ${formatValue(p.tiers.pot.current)}, peak: ${formatValue(p.tiers.pot.peak)}, retired: ${formatValue(p.tiers.pot.retired)} },
      nethop: { current: ${formatValue(p.tiers.nethop.current)}, peak: ${formatValue(p.tiers.nethop.peak)}, retired: ${formatValue(p.tiers.nethop.retired)} },
      smp: { current: ${formatValue(p.tiers.smp.current)}, peak: ${formatValue(p.tiers.smp.peak)}, retired: ${formatValue(p.tiers.smp.retired)} },
      sword: { current: ${formatValue(p.tiers.sword.current)}, peak: ${formatValue(p.tiers.sword.peak)}, retired: ${formatValue(p.tiers.sword.retired)} },
      axe: { current: ${formatValue(p.tiers.axe.current)}, peak: ${formatValue(p.tiers.axe.peak)}, retired: ${formatValue(p.tiers.axe.retired)} },
      mace: { current: ${formatValue(p.tiers.mace.current)}, peak: ${formatValue(p.tiers.mace.peak)}, retired: ${formatValue(p.tiers.mace.retired)} }
    }
  }`).join(',\n')}
];
`;
    
    fs.writeFileSync('src/js/players.js', fileContent);
    console.log(`Successfully wrote ${players.length} players to src/js/players.js`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

fetchPlayers();
