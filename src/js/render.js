/**
 * render.js – Perfect Visual Clone Rendering with Tooltips
 */

import { fetchGamemodes } from './api.js';
import { avatarUrl, getGamemodeImage } from './api.js';
import { getIcon } from './icons.js';

/* ----------------------------------------------------------
   Helpers
   ---------------------------------------------------------- */
const tierValues = { 'HT1': 1, 'LT1': 2, 'HT2': 3, 'LT2': 4, 'HT3': 5, 'LT3': 6, 'HT4': 7, 'LT4': 8, 'HT5': 9, 'LT5': 10 };

function getTierClass(tier) {
  if (!tier || typeof tier !== 'string') return 'ht5';
  return tier.toLowerCase();
}

function getTierLabel(tier) {
  if (!tier || typeof tier !== 'string') return 'HT5';
  return tier.toUpperCase();
}

function tierSortValue(tier) {
  return tierValues[getTierLabel(tier)] || 99;
}

function rankClass(rank) {
  if (rank === 1) return 'rank-1';
  if (rank === 2) return 'rank-2';
  if (rank === 3) return 'rank-3';
  return 'rank-other';
}

function regionClass(r) {
  const norm = (r || '').toLowerCase();
  if (norm === 'na') return 'na';
  if (norm === 'eu') return 'eu';
  return '';
}

const TOP_PLACE_BACKGROUNDS = {
  1: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
        <defs>
          <g id="b1" fill="#f0c863">
            <path d="M100 0h40L55 100H15zM70 0h15L0 100h-15z"/>
            <animateTransform attributeName="transform" calcMode="spline" dur="2s" keySplines="0.9 0 0.1 1" keyTimes="0; 1" repeatCount="indefinite" type="translate" values="-150 0; 200 0"/>
          </g>
        </defs>
        <path fill="#efba3c" stroke="#f0c863" stroke-width="4" d="M0 0h200l-35 100H0z"/>
        <clipPath id="a1"><path d="M0 0h200l-35 100H0z"/></clipPath>
        <use clip-path="url(#a1)" href="#b1"/>
      </svg>`,
  2: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
        <defs>
          <g id="b2" fill="#a0b0b7">
            <path d="M100 0h40L55 100H15zM70 0h15L0 100h-15z"/>
            <animateTransform attributeName="transform" calcMode="spline" dur="2s" keySplines="0.9 0 0.1 1" keyTimes="0; 1" repeatCount="indefinite" type="translate" values="-150 0; 200 0"/>
          </g>
        </defs>
        <path fill="#879ea5" stroke="#a0b0b7" stroke-width="4" d="M0 0h200l-35 100H0z"/>
        <clipPath id="a2"><path d="M0 0h200l-35 100H0z"/></clipPath>
        <use clip-path="url(#a2)" href="#b2"/>
      </svg>`,
  3: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
        <defs>
          <g id="b3" fill="#c58152">
            <path d="M100 0h40L55 100H15zM70 0h15L0 100h-15z"/>
            <animateTransform attributeName="transform" calcMode="spline" dur="2s" keySplines="0.9 0 0.1 1" keyTimes="0; 1" repeatCount="indefinite" type="translate" values="-150 0; 200 0"/>
          </g>
        </defs>
        <path fill="#b56329" stroke="#c58152" stroke-width="4" d="M0 0h200l-35 100H0z"/>
        <clipPath id="a3"><path d="M0 0h200l-35 100H0z"/></clipPath>
        <use clip-path="url(#a3)" href="#b3"/>
      </svg>`
};

const OTHER_PLACE_BACKGROUND = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
  <path fill="#2d3748" stroke="#4a5568" stroke-width="2" d="M0 0h200l-35 100H0z"/>
</svg>`;

const TITLES = [
  { name: 'Combat Grandmaster', threshold: 400, icon: '../info icon/combat_grandmaster.webp', color: '#fbbf24' },
  { name: 'Combat Master', threshold: 250, icon: '../info icon/combat_master.webp', color: '#fcd34d' },
  { name: 'Combat Ace', threshold: 100, icon: '../info icon/combat_ace.webp', color: '#f87171' },
  { name: 'Combat Specialist', threshold: 50, icon: '../info icon/combat_specialist.svg', color: '#c084fc' },
  { name: 'Combat Cadet', threshold: 20, icon: '../info icon/combat_cadet.svg', color: '#818cf8' },
  { name: 'Combat Novice', threshold: 10, icon: '../info icon/combat_novice.svg', color: '#93c5fd' },
  { name: 'Rookie', threshold: 0, icon: '../info icon/rookie.svg', color: '#9ca3af' }
];

// Emulate point-based titles roughly based on official site
function rankNameCalc(points) {
  return TITLES.find(t => points >= t.threshold) || TITLES[TITLES.length - 1];
}

/* ----------------------------------------------------------
   Tooltip Builder for Tier Info (Peak/Current/Retired)
   ---------------------------------------------------------- */
function buildTierTooltip(slug, r) {
  // Helper to format tier value with HT/LT prefix
  const formatTier = (val) => {
    if (val === null || val === undefined) return 'N/A';
    // If it's already a string like "HT1" or "LT2", return as-is
    if (typeof val === 'string') return val.toUpperCase();
    const num = parseInt(val, 10);
    if (isNaN(num)) return String(val);
    // For tiers 1-3, use HT (High Tier), for 4-5 use LT (Low Tier)
    const prefix = num <= 3 ? 'HT' : 'LT';
    return `${prefix}${num}`;
  };

  const peak = formatTier(r.peak);
  const current = formatTier(r.current);
  const retired = r.retired === true ? 'Yes' : 'No';

  return `
    <div class="tier-tooltip">
      <div class="tooltip-header">${slug.toUpperCase()}</div>
      <div class="tooltip-row"><span class="tooltip-label">Peak:</span><span class="tooltip-value tier-${peak.toLowerCase()}">${peak}</span></div>
      <div class="tooltip-row"><span class="tooltip-label">Current:</span><span class="tooltip-value tier-${current.toLowerCase()}">${current}</span></div>
      <div class="tooltip-row"><span class="tooltip-label">Retired:</span><span class="tooltip-value tier-retired">${retired}</span></div>
    </div>
  `;
}

/* ----------------------------------------------------------
   Overall Mode Row Builder - MCTiers Style
   ---------------------------------------------------------- */
async function buildOverallRow(player, rank) {
  const { uuid, name, region, points, rankings } = player;

  // Use 3D bust avatar like MCTiers
  const avatar = avatarUrl(uuid, 80, name);

  // Gamemode Tiers - display on right side like MCTiers
  // Filter out 'overall' tier since rank is already displayed
  const gamemodes = Object.entries(rankings || {})
    .filter(([slug, r]) => r && slug !== 'overall')
    .sort(([_, a], [__, b]) => tierSortValue(a.tier, a.pos) - tierSortValue(b.tier, b.pos));

  // Build tier badges - larger size like MCTiers
  const tiersHtml = await Promise.all(gamemodes.map(async ([slug, r]) => {
    const iconHtml = await getIcon(slug);
    
    let stateClass = '';
    if (r.state === 'retired') stateClass = 'retired-tier';
    if (r.state === 'peak') stateClass = 'peak-tier';

    const tooltipHtml = buildTierTooltip(slug, r).replace(/"/g, '&quot;');
    const tierClass = getTierClass(r.tier);
    const tierLabel = getTierLabel(r.tier);

    return `
      <div class="mctiers-tier-badge ${stateClass} tier-${tierClass}" data-tooltip="${tooltipHtml}">
        <div class="tier-icon">${iconHtml}</div>
        <div class="tier-label">${tierLabel}</div>
      </div>
    `;
  }));

  const titleData = rankNameCalc(points || 0);
  const rowClass = rank <= 3 ? `top-rank-${rank}` : '';
  const top3Bg = rank <= 3 ? TOP_PLACE_BACKGROUNDS[rank] : '';
  const otherBg = rank > 3 ? OTHER_PLACE_BACKGROUND : '';

  return `
    <div class="mctiers-player-row ${rowClass}" data-name="${name.toLowerCase()}" data-player='${JSON.stringify(player).replace(/'/g, "&#39;")}' style="cursor: pointer;">
      <div class="player-rank">${rank}</div>
      
      <div class="player-skin-wrapper">
        ${top3Bg ? `<span class="top3-bg" aria-hidden="true">${top3Bg}</span>` : ''}
        ${otherBg ? `<span class="other-bg" aria-hidden="true">${otherBg}</span>` : ''}
        <div class="rank-in-shimmer">${rank}</div>
        <div class="player-skin">
          <img src="${avatar}" alt="${name}" loading="lazy" onerror="this.src='https://minotar.net/bust/MHF_Steve/80.png';this.onerror=null;" />
        </div>
      </div>
      
      <div class="player-info">
        <div class="player-name">${name}</div>
        <div class="player-meta">
          <img src="${titleData.icon}" class="title-icon-small" alt="${titleData.name}" />
          <span class="rank-badge" style="color: ${titleData.color}">${titleData.name}</span>
          <span class="points">(${points || 0} points)</span>
        </div>
      </div>
      
      <div class="player-region">
        <span class="region-tag ${regionClass(region)}">${region || '??'}</span>
      </div>
      
      <div class="player-tiers">
        ${tiersHtml.join('')}
      </div>
    </div>
  `;
}

/* ----------------------------------------------------------
   Gamemode 5-Column Grid Builder
   ---------------------------------------------------------- */
const T1_ICON = `<svg class="tier-header-icon" viewBox="0 0 1080 1080" style="width:24px;height:24px;"><path d="M859.2 273.1v63.7c0 178.7-143.7 421.8-322.1 425.6-1.6.3-2.9.3-4.5.3-180.3 0-326.5-245.6-326.5-425.9v-132c0-90.2 73.3-95.1 163.4-95.1h326.2c90.2 0 163.4 73.3 163.4 163.4Z" fill="#ffaf00"/><path d="M532.6 376.5v445.9" style="fill:none"/><path d="M621.2 376.7v445.7c0 47.5-37.3 86-84.1 88.6h-4.5c-49.1 0-88.6-39.5-88.6-88.6V376.7c0-49.1 39.5-88.9 88.6-88.9s88.6 39.8 88.6 88.9" fill="#ffaf00"/><path d="M735.5 929.4c0 26.8-21.7 48.7-48.4 48.7h-309c-26.8 0-48.4-22-48.4-48.7s12.1-56.1 31.2-75.5c19.4-19.4 46.2-31.5 75.8-31.5h191.8c59.2 0 107 48.1 107 107" fill="#ffaf00"/><path d="M818.2 230.5s176.3-42.8 176.3 95.2-77 427-302.6 345.7" style="fill:none;stroke-linecap:round;stroke-miterlimit:10;stroke-width:96.4px;stroke:#ffa100"/><path d="M255.7 230.5S79.4 187.7 79.4 325.7s77 427 302.6 345.7" style="fill:none;stroke:#ffaf00;stroke-linecap:round;stroke-miterlimit:10;stroke-width:96.4px"/><path d="M621.2 742.7v79.6h7.3c59.2 0 107 48.1 107 107S713.8 978 687.1 978h-150V109.7h158.6c90.2 0 163.4 5 163.4 95.1v132c0 149.4-100.7 344-238 405.8Z" fill="#ffa100"/></svg>`;
const T2_ICON = `<svg class="tier-header-icon" viewBox="0 0 1080 1080" style="width:24px;height:24px;"><path d="M859.2 273.1v63.7c0 178.7-143.7 421.8-322.1 425.6-1.6.3-2.9.3-4.5.3-180.3 0-326.5-245.6-326.5-425.9v-132c0-90.2 73.3-95.1 163.4-95.1h326.2c90.2 0 163.4 73.3 163.4 163.4Z" fill="#b4bdc7"/><path d="M532.6 376.5v445.9" style="fill:none"/><path d="M621.2 376.7v445.7c0 47.5-37.3 86-84.1 88.6h-4.5c-49.1 0-88.6-39.5-88.6-88.6V376.7c0-49.1 39.5-88.9 88.6-88.9s88.6 39.8 88.6 88.9" fill="#b4bdc7"/><path d="M735.5 929.4c0 26.8-21.7 48.7-48.4 48.7h-309c-26.8 0-48.4-22-48.4-48.7s12.1-56.1 31.2-75.5c19.4-19.4 46.2-31.5 75.8-31.5h191.8c59.2 0 107 48.1 107 107" fill="#b4bdc7"/><path d="M818.2 230.5s176.3-42.8 176.3 95.2-77 427-302.6 345.7" style="fill:none;stroke-linecap:round;stroke-miterlimit:10;stroke-width:96.4px;stroke:#a0acba"/><path d="M255.7 230.5S79.4 187.7 79.4 325.7s77 427 302.6 345.7" style="fill:none;stroke:#b4bdc7;stroke-linecap:round;stroke-miterlimit:10;stroke-width:96.4px"/><path d="M621.2 742.7v79.6h7.3c59.2 0 107 48.1 107 107S713.8 978 687.1 978h-150V109.7h158.6c90.2 0 163.4 5 163.4 95.1v132c0 149.4-100.7 344-238 405.8Z" fill="#a0acba"/></svg>`;
const T3_ICON = `<svg class="tier-header-icon" viewBox="0 0 1080 1080" style="width:24px;height:24px;"><path d="M859.2 273.1v63.7c0 178.7-143.7 421.8-322.1 425.6-1.6.3-2.9.3-4.5.3-180.3 0-326.5-245.6-326.5-425.9v-132c0-90.2 73.3-95.1 163.4-95.1h326.2c90.2 0 163.4 73.3 163.4 163.4Z" fill="#b56328"/><path d="M532.6 376.5v445.9" style="fill:none"/><path d="M621.2 376.7v445.7c0 47.5-37.3 86-84.1 88.6h-4.5c-49.1 0-88.6-39.5-88.6-88.6V376.7c0-49.1 39.5-88.9 88.6-88.9s88.6 39.8 88.6 88.9" fill="#b56328"/><path d="M735.5 929.4c0 26.8-21.7 48.7-48.4 48.7h-309c-26.8 0-48.4-22-48.4-48.7s12.1-56.1 31.2-75.5c19.4-19.4 46.2-31.5 75.8-31.5h191.8c59.2 0 107 48.1 107 107" fill="#b56328"/><path d="M818.2 230.5s176.3-42.8 176.3 95.2-77 427-302.6 345.7" style="stroke:#a15c2a;fill:none;stroke-linecap:round;stroke-miterlimit:10;stroke-width:96.4px"/><path d="M255.7 230.5S79.4 187.7 79.4 325.7s77 427 302.6 345.7" style="fill:none;stroke-linecap:round;stroke-miterlimit:10;stroke-width:96.4px;stroke:#b56328"/><path d="M621.2 742.7v79.6h7.3c59.2 0 107 48.1 107 107S713.8 978 687.1 978h-150V109.7h158.6c90.2 0 163.4 5 163.4 95.1v132c0 149.4-100.7 344-238 405.8Z" fill="#a15c2a"/></svg>`;

async function createGamemodeRow(p, tier, slug, isFirstPlace = false) {
  const avatar = avatarUrl(p.uuid, 64, p.name);
  const highlightCls = isFirstPlace ? 'rank-1-highlight' : '';
  const tierClass = getTierClass(tier);
  const tierLabel = getTierLabel(tier);
  
  // Extract tier number from string for points calculation
  const tierNum = parseInt(tier.slice(-1), 10) || 5;
  const isHT = tier.toUpperCase().startsWith('HT');
  const pts = ((6 - tierNum) * 100) + (isHT ? 50 : 0); // Visual placeholder

  const iconHtml = await getIcon(slug); // Use local tab icons - now async

  // Build tooltip for gamemode row
  const tooltipHtml = buildTierTooltip(slug, p).replace(/"/g, '&quot;');

  return `
    <div class="gm-player-row ${highlightCls}" data-tooltip="${tooltipHtml}" data-player='${JSON.stringify(p).replace(/'/g, "&#39;")}' style="cursor: pointer;">
      <img class="gm-row-avatar" src="${avatar}" loading="lazy" onerror="this.src='https://visage.surgeplay.com/bust/64/MHF_Steve.png';this.onerror=null;" />
      <div class="gm-row-info">
        <span class="gm-row-name">${p.name}</span>
        <span class="gm-row-points">${pts} pts</span>
      </div>
      <div class="gm-row-region">
        <span class="region-badge ${regionClass(p.region)}">${p.region || '??'}</span>
      </div>
      <div class="gm-row-badge">
        <div class="tier-pill pill-${tierClass}"><div class="tier-icon">${iconHtml}</div>${tierLabel}</div>
      </div>
    </div>
  `;
}

async function buildGamemodeColumnsHTML(tierData, slug) {
  let html = `<div class="gamemode-grid-container">`;

  // 5 tier columns (1-5), each containing LT and HT players
  for (let tier = 1; tier <= 5; tier++) {
    const players = tierData[String(tier)] || [];
    const headerClass = `header-t${tier}`;

    html += `
      <div class="tier-col" id="tier-col-${tier}">
        <div class="tier-col-header header-t${tier}">
          ${tier === 1 ? T1_ICON : (tier === 2 ? T2_ICON : (tier === 3 ? T3_ICON : ''))} Tier ${tier}
        </div>
        <div class="tier-list">
    `;

    // Build rows asynchronously
    const playerRows = await Promise.all(
      players.map((p, index) => createGamemodeRow(p, p.tier, slug, (tier === 1 && index === 0 && p.isHT)))
    );
    html += playerRows.join('');

    html += `
        </div>
      </div>
    `;
  }
  
  html += `</div>`;
  return html;
}

/* ----------------------------------------------------------
   Exported Render Functions
   ---------------------------------------------------------- */

/**
 * renderHome – Renders the structured professional Home page
 */
export async function renderHome(container) {
  const modes = await fetchGamemodes();
  const modeIcons = {};
  
  // Pre-load icons for gamemode section
  for (const slug of modes) {
    modeIcons[slug] = await getIcon(slug);
  }

  const gamemodeDescriptions = {
    vanilla: "The ultimate test of mechanical skill and positioning. Crystal PvP (CPvP) focuses on explosive timing, totem management, and rapid movement.",
    uhc: "Ultra Hardcore combat. No natural regeneration means every heart counts. Master rod usage, bow pressure, and golden head management.",
    pot: "High-intensity Potion PvP. Speed, aggression, and perfect potion management are key to outlasting your opponent in these fast-paced duels.",
    nethop: "Netherite combat with a focus on shielding and stamina. Strategic positioning and knowing when to go for the critical hit is vital.",
    smp: "The classic survival multiplayer experience. A mix of utility, gear optimization, and versatile combat skills across various terrains.",
    sword: "Pure mechanical sword fighting. Focus on reach, aim, and strafing to dominate your opponent in a fair 1v1 duel.",
    axe: "Strategic axe and shield combat. Shield disabling and timing your heavy hits are the keys to victory in this high-damage mode.",
    mace: "New-era combat mechanics utilizing the Mace. Learn to play around height and heavy impact to crush your enemies.",
    ltm: "Limited Time Modes and 2v2/3v3 team-based rankings. Cooperation and diverse skillsets are required to climb the ranks."
  };

  const html = `
    <div class="home-container">
      <!-- Hero Section -->
      <section class="home-hero-card">
        <div class="hero-content">
          <h1 class="hero-title">Welcome to <img src="../MAIN ICON/ST 512px.png" class="hero-logo-img" alt="Logo"></h1>
          <p class="hero-subtitle">The definitive ranking system for competitive Minecraft PvP players.</p>
        </div>
      </section>

      <!-- Gamemodes Section -->
      <section class="home-section">
        <div class="section-header">
          <h2 class="section-title">Combat Disciplines</h2>
          <p class="section-desc">Each gamemode features its own unique leaderboard and tier system.</p>
        </div>
        <div class="gamemode-info-grid">
          ${modes.map(slug => {
            if (slug === 'overall') return '';
            const name = slug.charAt(0).toUpperCase() + slug.slice(1);
            const desc = gamemodeDescriptions[slug] || "Competitive PvP ranking for this specific discipline.";
            return `
              <div class="info-card gamemode-card gamemode-${slug}" data-mode="${slug}">
                <div class="info-card-icon">${modeIcons[slug]}</div>
                <h3 class="info-card-title">${name === 'Ltm' ? '2v2 / LTM' : name}</h3>
                <p class="info-card-text">${desc}</p>
                <div class="card-action">View Rankings <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg></div>
              </div>
            `;
          }).join('')}
        </div>
      </section>

      <!-- Tier System Section -->
      <section class="home-two-col">
        <div class="info-card tier-explanation">
          <div class="section-header">
            <h2 class="section-title">The Tier System</h2>
          </div>
          <div class="tier-progression-map">
            <div class="prog-step pill-ht1">HT1 <span class="prog-label">The Pinnacle</span></div>
            <div class="prog-step pill-lt1">LT1 <span class="prog-label">Elite Low Tier</span></div>
            <div class="prog-step pill-ht2">HT2 <span class="prog-label">High Tier 2</span></div>
            <div class="prog-step pill-lt2">LT2 <span class="prog-label">Low Tier 2</span></div>
            <div class="prog-step pill-ht3">HT3 <span class="prog-label">High Tier 3</span></div>
            <div class="prog-step pill-lt3">LT3 <span class="prog-label">Low Tier 3</span></div>
            <div class="prog-step pill-ht4">HT4 <span class="prog-label">High Tier 4</span></div>
            <div class="prog-step pill-lt4">LT4 <span class="prog-label">Low Tier 4</span></div>
            <div class="prog-step pill-ht5">HT5 <span class="prog-label">Entry High</span></div>
            <div class="prog-step pill-lt5">LT5 <span class="prog-label">Entry Level</span></div>
          </div>
          <p class="info-card-text mt-4">
            Our ranking logic divides skill into <strong>High Tier (HT)</strong> and <strong>Low Tier (LT)</strong>. 
            HT1 represents the absolute elite players globally, while LT5 serves as the entry point into the ranked competitive scene.
          </p>
        </div>

        <div class="info-card testing-info">
          <div class="section-header">
            <h2 class="section-title">Tier Testing Process</h2>
          </div>
          <div class="testing-steps">
            <div class="test-step">
              <div class="step-num">1</div>
              <div class="step-content">
                <h4>The Duel</h4>
                <p>Players must 1v1 an established tester already ranked in or above the desired tier.</p>
              </div>
            </div>
            <div class="test-step">
              <div class="step-num">2</div>
              <div class="step-content">
                <h4>Evaluation</h4>
                <p>Testers judge performance, consistency, mechanics, and technical proficiency, not just the win/loss ratio.</p>
              </div>
            </div>
            <div class="test-step">
              <div class="step-num">3</div>
              <div class="step-content">
                <h4>Promotion</h4>
                <p>If the player demonstrates the required skill level consistently, they are promoted to the new tier.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Discord Section -->
      <section class="discord-cta-card">
        <div class="discord-content">
          <h2>Ready to get tested?</h2>
          <p>Join our Discord community to request a test, view official rules, and connect with other top-tier players.</p>
          <ol class="cta-steps">
            <li>Join the Discord Server</li>
            <li>Open a Tier Request Ticket</li>
            <li>Wait for an available Moderator/Tester</li>
            <li>Play your matches and receive evaluation</li>
          </ol>
          <a href="https://discord.com/invite/mcpvp" target="_blank" rel="noopener noreferrer" class="discord-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
            Join Official Discord
          </a>
        </div>
      </section>

      <!-- Rules & Fair Play -->
      <section class="home-section rules-section">
        <h2 class="section-title">Rules & Fair Play</h2>
        <div class="rules-container">
          <div class="rule-card rule-cheating">
            <div class="rule-icon-glow"></div>
            <div class="rule-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM12 8v4M12 16h.01" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="rule-content">
              <h3>NO CHEATING</h3>
              <p>Any use of unfair clients or modifications results in a permanent ban.</p>
            </div>
          </div>

          <div class="rule-card rule-boosting">
            <div class="rule-icon-glow"></div>
            <div class="rule-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </div>
            <div class="rule-content">
              <h3>NO BOOSTING</h3>
              <p>Match results must be organic and fair. Intentional ranking manipulation is strictly prohibited.</p>
            </div>
          </div>

          <div class="rule-card rule-sportsmanship">
            <div class="rule-icon-glow"></div>
            <div class="rule-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke-linecap="round"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="rule-content">
              <h3>SPORTSMANSHIP</h3>
              <p>Respect all opponents and staff members. Maintain a professional competitive environment.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  `;
  
  container.innerHTML = html;
}

export async function renderOverallCards(players, container, append = false, startRank = 1) {
  // Build all player rows asynchronously
  const playerRows = await Promise.all(
    players.map((p, i) => buildOverallRow(p, startRank + i))
  );
  
  const html = playerRows.join('');
  
  if (append) {
    container.insertAdjacentHTML('beforeend', html);
  } else {
    // Add column headers for Overall tab
    const headersHtml = `
      <div class="overall-headers">
        <div class="header-rank">#</div>
        <div class="header-player">PLAYER</div>
        <div class="header-region">REGION</div>
        <div class="header-tiers">TIERS</div>
      </div>
    `;
    container.innerHTML = headersHtml + html;
  }

  // Initialize tooltips after rendering
  initTooltips(container);
}

export async function renderGamemodeColumns(tierData, slug, container, append = false) {
  if (append) {
    // 5 tier columns (1-5)
    for (let tier = 1; tier <= 5; tier++) {
      const parentList = container.querySelector(`#tier-col-${tier} .tier-list`);
      if (parentList) {
        const players = tierData[String(tier)] || [];
        // Build rows asynchronously
        const playerRows = await Promise.all(
          players.map(p => createGamemodeRow(p, p.tier, slug))
        );
        parentList.insertAdjacentHTML('beforeend', playerRows.join(''));
      }
    }
    // Initialize tooltips for newly added rows
    initTooltips(container);
  } else {
    container.innerHTML = await buildGamemodeColumnsHTML(tierData, slug);
    // Initialize tooltips after rendering
    initTooltips(container);
  }
}

export function clearGrid(container) {
  container.innerHTML = '';
}

/**
 * Re-initialise tooltips and click handlers for a single newly-added row.
 * Used when a player is injected by the search flow outside of a full render cycle.
 */
export function initNewRow(rowEl) {
  if (!rowEl) return;
  // Tooltips on tier badges within the row
  const tooltipTriggers = rowEl.querySelectorAll('[data-tooltip]');
  const tooltipContainer = document.getElementById('tier-tooltip-container');
  if (tooltipContainer) {
    tooltipTriggers.forEach(trigger => {
      trigger.addEventListener('mouseenter', (e) => {
        const html = trigger.getAttribute('data-tooltip');
        if (!html) return;
        tooltipContainer.innerHTML = html;
        tooltipContainer.style.opacity = '1';
        tooltipContainer.style.transform = 'scale(1)';
        const rect = trigger.getBoundingClientRect();
        const tRect = tooltipContainer.getBoundingClientRect();
        let top = rect.top - tRect.height - 10;
        let left = rect.left + rect.width / 2 - tRect.width / 2;
        if (top < 10) top = rect.bottom + 10;
        if (left < 10) left = 10;
        else if (left + tRect.width > window.innerWidth - 10) left = window.innerWidth - tRect.width - 10;
        tooltipContainer.style.top = `${top}px`;
        tooltipContainer.style.left = `${left}px`;
      });
      trigger.addEventListener('mouseleave', () => {
        tooltipContainer.style.opacity = '0';
        tooltipContainer.style.transform = 'scale(0.95)';
      });
    });
  }
  // Profile modal click handler
  if (rowEl.dataset.player) {
    rowEl.addEventListener('click', (e) => {
      if (e.target.closest('a') || e.target.closest('button')) return;
      try {
        const player = JSON.parse(rowEl.getAttribute('data-player'));
        import('./playerProfile.js').then(m => m.openPlayerProfile(player));
      } catch (err) {
        console.error('Failed to parse player data:', err);
      }
    });
  }
}

export function renderSkeletons(container) {
  container.innerHTML = `
    <div class="loading-spinner">
      <div class="spinner-ring"></div>
      <div style="margin-top:1rem; color:var(--text-muted); font-size:0.85rem; font-weight:600;">Loading players...</div>
    </div>
  `;
}

/* ----------------------------------------------------------
   Tooltip Initialization
   ---------------------------------------------------------- */
export function initTooltips(container) {
  // Remove any existing tooltip container
  const existingTooltip = document.getElementById('tier-tooltip-container');
  if (existingTooltip) {
    existingTooltip.remove();
  }

  // Create global tooltip container
  const tooltipContainer = document.createElement('div');
  tooltipContainer.id = 'tier-tooltip-container';
  tooltipContainer.className = 'tier-tooltip-container';
  tooltipContainer.style.cssText = `
    position: fixed;
    pointer-events: none;
    z-index: 10000;
    opacity: 0;
    transition: opacity 0.2s ease, transform 0.2s ease;
    transform: scale(0.95);
  `;
  document.body.appendChild(tooltipContainer);

  // Add event listeners to all tier icon groups with tooltips
  const tooltipTriggers = container.querySelectorAll('[data-tooltip]');

  tooltipTriggers.forEach(trigger => {
    trigger.addEventListener('mouseenter', (e) => {
      const tooltipHtml = trigger.getAttribute('data-tooltip');
      if (!tooltipHtml) return;

      tooltipContainer.innerHTML = tooltipHtml;
      tooltipContainer.style.opacity = '1';
      tooltipContainer.style.transform = 'scale(1)';

      positionTooltip(e, tooltipContainer, trigger);
    });

    trigger.addEventListener('mouseleave', () => {
      tooltipContainer.style.opacity = '0';
      tooltipContainer.style.transform = 'scale(0.95)';
    });

    trigger.addEventListener('mousemove', (e) => {
      positionTooltip(e, tooltipContainer, trigger);
    });
  });

  // Add click listeners to player rows for profile modal
  initPlayerRowClicks(container);
}

function positionTooltip(e, tooltipContainer, trigger) {
  const rect = trigger.getBoundingClientRect();
  const tooltipRect = tooltipContainer.getBoundingClientRect();

  // Position above the element by default
  let top = rect.top - tooltipRect.height - 10;
  let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

  // If too close to top, position below
  if (top < 10) {
    top = rect.bottom + 10;
  }

  // Keep within viewport horizontally
  if (left < 10) {
    left = 10;
  } else if (left + tooltipRect.width > window.innerWidth - 10) {
    left = window.innerWidth - tooltipRect.width - 10;
  }

  tooltipContainer.style.top = `${top}px`;
  tooltipContainer.style.left = `${left}px`;
}

/**
 * Initialize click handlers for player rows to open profile modal
 */
function initPlayerRowClicks(container) {
  const playerRows = container.querySelectorAll('[data-player]');
  
  console.log('Found player rows:', playerRows.length);
  
  playerRows.forEach(row => {
    row.addEventListener('click', (e) => {
      console.log('Player row clicked!', e.target);
      
      // Don't trigger if clicking on a link or button inside the row
      if (e.target.closest('a') || e.target.closest('button')) return;
      
      const playerData = row.getAttribute('data-player');
      console.log('Player data:', playerData);
      
      if (playerData) {
        try {
          const player = JSON.parse(playerData);
          console.log('Parsed player:', player);
          // Import and open player profile modal
          import('./playerProfile.js').then(module => {
            module.openPlayerProfile(player);
          });
        } catch (err) {
          console.error('Failed to parse player data:', err);
        }
      }
    });
  });
}
