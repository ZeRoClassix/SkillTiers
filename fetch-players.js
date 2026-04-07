const axios = require('axios');
const fs = require('fs');

// Gamemode mapping from API to our structure
const gamemodes = [
  'overall',
  'ltm',
  'vanilla', 
  'uhc',
  'pot',
  'nethop',
  'smp',
  'sword',
  'axe',
  'mace'
];

// Convert tier data to our format
function convertTier(tierData) {
  if (!tierData) {
    return { current: null, peak: null, retired: null };
  }
  
  // If tierData is a string, treat it as current tier
  if (typeof tierData === 'string') {
    return { current: tierData, peak: tierData, retired: null };
  }
  
  // If tierData is an object with properties
  return {
    current: tierData.current || tierData.tier || null,
    peak: tierData.peak || tierData.best || tierData.current || tierData.tier || null,
    retired: tierData.retired || null
  };
}

// Format tier string (e.g., "high_tier_1" -> "HT1")
function formatTier(tier) {
  if (!tier) return null;
  if (typeof tier !== 'string') return null;
  
  // Handle various formats
  const match = tier.toString().match(/(high|low)_tier_(\d+)/i);
  if (match) {
    const prefix = match[1].toLowerCase() === 'high' ? 'HT' : 'LT';
    return `${prefix}${match[2]}`;
  }
  
  // Already formatted
  if (/^[HL]T\d$/.test(tier)) {
    return tier;
  }
  
  return tier;
}

// Main function to fetch and convert player data
async function fetchAndConvertPlayers() {
  try {
    console.log('Fetching player data from MCTiers API...');
    
    // Fetch overall rankings
    const response = await axios.get('https://mctiers.com/api/v2/overall?limit=500');
    const apiPlayers = response.data;
    
    console.log(`Fetched ${apiPlayers.length} players`);
    
    // Convert to our format
    const players = apiPlayers.map((player, index) => {
      const rank = index + 1;
      
      // Build tiers object
      const tiers = {};
      gamemodes.forEach(mode => {
        const apiTier = player[mode] || player.tiers?.[mode];
        tiers[mode] = convertTier(apiTier);
        
        // Format the tier strings
        if (tiers[mode].current) tiers[mode].current = formatTier(tiers[mode].current);
        if (tiers[mode].peak) tiers[mode].peak = formatTier(tiers[mode].peak);
        if (tiers[mode].retired) tiers[mode].retired = formatTier(tiers[mode].retired);
      });
      
      return {
        username: player.name || player.username,
        uuid: "", // Leave empty as requested
        points: player.points || 0,
        rank: rank,
        region: player.region || "NA",
        tiers: tiers
      };
    });
    
    // Generate the players.js content
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
    
    // Write to file
    fs.writeFileSync('src/js/players.js', fileContent);
    console.log(`Successfully wrote ${players.length} players to src/js/players.js`);
    
  } catch (error) {
    console.error('Error fetching player data:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Helper function to format values for output
function formatValue(value) {
  if (value === null || value === undefined) {
    return 'null';
  }
  return `"${value}"`;
}

fetchAndConvertPlayers();
