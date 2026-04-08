/**
 * Player Profile Modal
 * Handles displaying player details in a modal when clicking on player rows
 */

import { getIcon } from './icons.js';
import { gamemodes, players } from './players.js';

// Title requirements mapping
const titleRequirements = {
    'Combat Grandmaster': 'Obtained 400+ total points.',
    'Combat Master': 'Obtained 250+ total points.',
    'Combat Ace': 'Obtained 100+ total points.',
    'Combat Specialist': 'Obtained 50+ total points.',
    'Combat Cadet': 'Obtained 20+ total points.',
    'Combat Novice': 'Obtained 10+ total points.',
    'Rookie': 'Starting rank for players with less than 10 points.'
};

const titleColors = {
    'Combat Grandmaster': '#fbbf24',
    'Combat Master': '#fcd34d',
    'Combat Ace': '#f87171',
    'Combat Specialist': '#c084fc',
    'Combat Cadet': '#818cf8',
    'Combat Novice': '#93c5fd',
    'Rookie': '#9ca3af'
};

// Rank place icons (inline SVGs)
const tier1Svg = `<svg viewBox="0 0 1080 1080" class="rank-place-icon"><path d="M859.2 273.1v63.7c0 178.7-143.7 421.8-322.1 425.6-1.6.3-2.9.3-4.5.3-180.3 0-326.5-245.6-326.5-425.9v-132c0-90.2 73.3-95.1 163.4-95.1h326.2c90.2 0 163.4 73.3 163.4 163.4Z" fill="#ffaf00"/><path d="M532.6 376.5v445.9" style="fill:none"/><path d="M621.2 376.7v445.7c0 47.5-37.3 86-84.1 88.6h-4.5c-49.1 0-88.6-39.5-88.6-88.6V376.7c0-49.1 39.5-88.9 88.6-88.9s88.6 39.8 88.6 88.9" fill="#ffaf00"/><path d="M735.5 929.4c0 26.8-21.7 48.7-48.4 48.7h-309c-26.8 0-48.4-22-48.4-48.7s12.1-56.1 31.2-75.5c19.4-19.4 46.2-31.5 75.8-31.5h191.8c59.2 0 107 48.1 107 107" fill="#ffaf00"/><path d="M818.2 230.5s176.3-42.8 176.3 95.2-77 427-302.6 345.7" style="fill:none;stroke-linecap:round;stroke-miterlimit:10;stroke-width:96.4px;stroke:#ffa100"/><path d="M255.7 230.5S79.4 187.7 79.4 325.7s77 427 302.6 345.7" style="fill:none;stroke:#ffaf00;stroke-linecap:round;stroke-miterlimit:10;stroke-width:96.4px"/><path d="M621.2 742.7v79.6h7.3c59.2 0 107 48.1 107 107S713.8 978 687.1 978h-150V109.7h158.6c90.2 0 163.4 5 163.4 95.1v132c0 149.4-100.7 344-238 405.8Z" fill="#ffa100"/></svg>`;

const tier2Svg = `<svg viewBox="0 0 1080 1080" class="rank-place-icon"><path d="M859.2 273.1v63.7c0 178.7-143.7 421.8-322.1 425.6-1.6.3-2.9.3-4.5.3-180.3 0-326.5-245.6-326.5-425.9v-132c0-90.2 73.3-95.1 163.4-95.1h326.2c90.2 0 163.4 73.3 163.4 163.4Z" fill="#b4bdc7"/><path d="M532.6 376.5v445.9M621.2 376.7v445.7c0 47.5-37.3 86-84.1 88.6h-4.5c-49.1 0-88.6-39.5-88.6-88.6V376.7c0-49.1 39.5-88.9 88.6-88.9s88.6 39.8 88.6 88.9" fill="#b4bdc7"/><path d="M735.5 929.4c0 26.8-21.7 48.7-48.4 48.7h-309c-26.8 0-48.4-22-48.4-48.7s12.1-56.1 31.2-75.5c19.4-19.4 46.2-31.5 75.8-31.5h191.8c59.2 0 107 48.1 107 107" fill="#b4bdc7"/><path d="M818.2 230.5s176.3-42.8 176.3 95.2-77 427-302.6 345.7" style="stroke:#a0acba;fill:none;stroke-linecap:round;stroke-miterlimit:10;stroke-width:96.4px"/><path d="M255.7 230.5S79.4 187.7 79.4 325.7s77 427 302.6 345.7" style="fill:none;stroke-linecap:round;stroke-miterlimit:10;stroke-width:96.4px;stroke:#b4bdc7"/><path d="M621.2 742.7v79.6h7.3c59.2 0 107 48.1 107 107S713.8 978 687.1 978h-150V109.7h158.6c90.2 0 163.4 5 163.4 95.1v132c0 149.4-100.7 344-238 405.8Z" fill="#a0acba"/></svg>`;

const tier3Svg = `<svg viewBox="0 0 1080 1080" class="rank-place-icon"><path d="M859.2 273.1v63.7c0 178.7-143.7 421.8-322.1 425.6-1.6.3-2.9.3-4.5.3-180.3 0-326.5-245.6-326.5-425.9v-132c0-90.2 73.3-95.1 163.4-95.1h326.2c90.2 0 163.4 73.3 163.4 163.4Z" fill="#b56328"/><path d="M532.6 376.5v445.9M621.2 376.7v445.7c0 47.5-37.3 86-84.1 88.6h-4.5c-49.1 0-88.6-39.5-88.6-88.6V376.7c0-49.1 39.5-88.9 88.6-88.9s88.6 39.8 88.6 88.9" fill="#b56328"/><path d="M735.5 929.4c0 26.8-21.7 48.7-48.4 48.7h-309c-26.8 0-48.4-22-48.4-48.7s12.1-56.1 31.2-75.5c19.4-19.4 46.2-31.5 75.8-31.5h191.8c59.2 0 107 48.1 107 107" fill="#b56328"/><path d="M818.2 230.5s176.3-42.8 176.3 95.2-77 427-302.6 345.7" style="stroke:#a15c2a;fill:none;stroke-linecap:round;stroke-miterlimit:10;stroke-width:96.4px"/><path d="M255.7 230.5S79.4 187.7 79.4 325.7s77 427 302.6 345.7" style="fill:none;stroke-linecap:round;stroke-miterlimit:10;stroke-width:96.4px;stroke:#b56328"/><path d="M621.2 742.7v79.6h7.3c59.2 0 107 48.1 107 107S713.8 978 687.1 978h-150V109.7h158.6c90.2 0 163.4 5 163.4 95.1v132c0 149.4-100.7 344-238 405.8Z" fill="#a15c2a"/></svg>`;

let currentModalPlayer = null;

/**
 * Initialize the player profile modal
 */
export function initPlayerProfileModal() {
    console.log('Initializing player profile modal...');
    const overlay = document.getElementById('player-profile-overlay');
    const modalRoot = document.getElementById('player-profile-modal-root');
    
    console.log('Overlay:', overlay);
    console.log('Modal root:', modalRoot);
    
    if (!overlay || !modalRoot) {
        console.error('Modal elements not found!');
        return;
    }
    
    // Close modal on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closePlayerProfile();
        }
    });
    
    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
            closePlayerProfile();
        }
    });
}

/**
 * Open the player profile modal for a specific player
 */
export async function openPlayerProfile(player) {
    console.log('Opening player profile for:', player);
    const overlay = document.getElementById('player-profile-overlay');
    const modalRoot = document.getElementById('player-profile-modal-root');
    
    console.log('Overlay:', overlay);
    console.log('Modal root:', modalRoot);
    
    if (!overlay || !modalRoot) {
        console.error('Modal elements not found!');
        return;
    }
    
    // If player object is missing required fields, look up full player data
    let fullPlayer = player;
    if (!player.username && player.name) {
        // This is a simplified player object from gamemode view
        // Look up full player data
        fullPlayer = players.find(p => p.uuid === player.uuid || p.username === player.name);
        if (!fullPlayer) {
            console.error('Player not found in players array:', player);
            return;
        }
        console.log('Found full player data:', fullPlayer);
    }
    
    currentModalPlayer = fullPlayer;
    
    // Build modal content
    const modalHTML = await buildPlayerProfileHTML(fullPlayer);
    console.log('Modal HTML:', modalHTML);
    modalRoot.innerHTML = modalHTML;
    
    // Initialize tooltips for modal tier badges (same as overall tab)
    initModalTooltips(modalRoot);
    
    // Show modal - remove closing class first to ensure animation works
    overlay.classList.remove('closing');
    overlay.classList.add('active');
    document.body.classList.add('modal-open');
    
    console.log('Modal should be visible now');
}

/**
 * Close the player profile modal
 */
export function closePlayerProfile() {
    const overlay = document.getElementById('player-profile-overlay');
    
    if (!overlay) return;
    
    // Add closing class for smooth animation
    overlay.classList.add('closing');
    
    // Wait for animation to finish before hiding
    setTimeout(() => {
        overlay.classList.remove('active', 'closing');
        document.body.classList.remove('modal-open');
        currentModalPlayer = null;
    }, 300);
}

/**
 * Get player's overall rank position
 */
function getPlayerOverallPosition(player) {
    return player.rank ?? null;
}

/**
 * Get player title based on points
 */
function getPlayerTitle(points) {
    if (points >= 400) return 'Combat Grandmaster';
    if (points >= 250) return 'Combat Master';
    if (points >= 100) return 'Combat Ace';
    if (points >= 50) return 'Combat Specialist';
    if (points >= 20) return 'Combat Cadet';
    if (points >= 10) return 'Combat Novice';
    return 'Rookie';
}

/**
 * Get title icon path
 */
function getTitleIcon(title) {
    const iconMap = {
        'Combat Grandmaster': '../info icon/combat_grandmaster.webp',
        'Combat Master': '../info icon/combat_master.webp',
        'Combat Ace': '../info icon/combat_ace.webp',
        'Combat Specialist': '../info icon/combat_specialist.svg',
        'Combat Cadet': '../info icon/combat_cadet.svg',
        'Combat Novice': '../info icon/combat_novice.svg',
        'Rookie': '../info icon/rookie.svg'
    };
    return iconMap[title] || '';
}

/**
 * Build the HTML for the player profile modal
 */
async function buildPlayerProfileHTML(player) {
    const title = getPlayerTitle(player.points);
    const titleColor = titleColors[title] || '#9ca3af';
    const position = getPlayerOverallPosition(player);
    const isOutsideTop200 = position !== null && position > 200;
    const displayPosition = position || '-';
    
    return `
        <div class="player-profile-modal">
            <button class="player-profile-close" onclick="window.closePlayerProfile()" aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>
            
            <div class="player-profile-header">
                <div class="player-profile-skin ${position === 1 ? 'rank-1-glow' : position === 2 ? 'rank-2-glow' : position === 3 ? 'rank-3-glow' : ''}">
                    <img src="https://visage.surgeplay.com/bust/128/${player.uuid.replace(/-/g, '')}.png" 
                         alt="${player.username}" 
                         onerror="this.src='https://visage.surgeplay.com/bust/128/${player.username}.png'">
                </div>
                
                <h2 class="player-profile-name">
                    ${position === 1 ? tier1Svg : ''}
                    ${position === 2 ? tier2Svg : ''}
                    ${position === 3 ? tier3Svg : ''}
                    ${player.username}
                </h2>
                
                <div class="player-profile-title" style="background: ${titleColor}25; border: 1px solid ${titleColor}60; color: ${titleColor};">
                    <img src="${getTitleIcon(title)}" alt="" width="14" height="14" style="filter: none;">
                    ${title}
                    <div class="title-tooltip">
                        <div class="title-tooltip-name">${title}</div>
                        <div class="title-tooltip-requirement">${titleRequirements[title]}</div>
                    </div>
                </div>
                
                <div class="player-profile-region">${player.region || 'Unknown Region'}</div>
                
                <a href="https://namemc.com/profile/${player.username}" target="_blank" class="namemc-link">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                    NameMC
                </a>
            </div>
            
            <div class="player-profile-position">
                <div class="position-box">
                    ${position === 1 ? tier1Svg + '<span class="position-rank" style="color: #ffc107;">1</span>' : position === 2 ? tier2Svg + '<span class="position-rank" style="color: #c0c0c0;">2</span>' : position === 3 ? tier3Svg + '<span class="position-rank" style="color: #cd7f32;">3</span>' : `<span class="position-rank" style="color: #ffffff;">${displayPosition}</span>`}
                    <span class="position-text">OVERALL</span>
                    <span class="position-points">(${player.points} points)</span>
                </div>
            </div>
            
            <div class="player-profile-tiers">
                <div class="tiers-label">TIERS</div>
                <div class="tiers-grid">
                    ${await buildTiersGridHTML(player)}
                </div>
            </div>
        </div>
    `;
}

/**
 * Build the tiers grid HTML
 */
async function buildTiersGridHTML(player) {
    if (!player.tiers) return '';
    
    const gamemodeList = [
        { key: 'vanilla', label: 'Vanilla' },
        { key: 'uhc', label: 'UHC' },
        { key: 'pot', label: 'Pot' },
        { key: 'nethop', label: 'NethOP' },
        { key: 'smp', label: 'SMP' },
        { key: 'sword', label: 'Sword' },
        { key: 'axe', label: 'Axe' },
        { key: 'mace', label: 'Mace' }
    ];
    
    const tierHTMLs = await Promise.all(gamemodeList.map(async (gm) => {
        const tierData = player.tiers[gm.key];
        if (!tierData || (!tierData.current && !tierData.peak)) {
            return '';
        }
        
        const currentTier = tierData.current;
        const peakTier = tierData.peak;
        const isRetired = tierData.retired;
        
        // Determine which tier to display (current, peak, or retired)
        let displayTier = currentTier || peakTier;
        let tierClass = '';
        let extraClasses = [];
        
        if (displayTier) {
            const tierLower = displayTier.toLowerCase();
            tierClass = `tier-${tierLower}`;
            
            if (isRetired) {
                extraClasses.push('retired-tier');
            }
            
            // Check if this is peak tier
            if (peakTier && !isRetired && currentTier !== peakTier) {
                extraClasses.push('peak-tier');
            }
        }
        
        // Build tooltip HTML matching overall tab format
        const tooltipHtml = buildTierTooltipHTML(gm.label, tierData);
        const iconHtml = await getIcon(gm.key);
        
        return `
            <div class="mctiers-tier-badge ${tierClass} ${extraClasses.join(' ')}" data-tooltip="${tooltipHtml}">
                <div class="tier-icon">
                    ${iconHtml}
                </div>
                <span class="tier-label">${displayTier || '-'}</span>
            </div>
        `;
    }));
    
    return tierHTMLs.join('');
}

/**
 * Build tooltip HTML matching overall tab format
 */
function buildTierTooltipHTML(gamemodeName, tierData) {
    let html = `<div class="tier-tooltip"><div class="tooltip-header">${gamemodeName}</div>`;
    
    if (tierData.current) {
        const tierClass = tierData.current.toLowerCase();
        html += `<div class="tooltip-row"><span class="tooltip-label">Current</span><span class="tooltip-value ${tierClass}">${tierData.current}</span></div>`;
    }
    if (tierData.peak && tierData.peak !== tierData.current) {
        const tierClass = tierData.peak.toLowerCase();
        html += `<div class="tooltip-row"><span class="tooltip-label">Peak</span><span class="tooltip-value ${tierClass}">${tierData.peak}</span></div>`;
    }
    if (tierData.retired) {
        html += `<div class="tooltip-row"><span class="tooltip-label">Status</span><span class="tooltip-value" style="background: #6b7280; color: #fff;">Retired</span></div>`;
    }
    
    html += `</div>`;
    return html.replace(/"/g, '&quot;');
}

/**
 * Initialize tooltips for modal tier badges (same system as overall tab)
 */
function initModalTooltips(container) {
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

    // Add event listeners to all tier badges with tooltips
    const tooltipTriggers = container.querySelectorAll('[data-tooltip]');

    tooltipTriggers.forEach(trigger => {
        trigger.addEventListener('mouseenter', (e) => {
            const tooltipHtml = trigger.getAttribute('data-tooltip');
            if (!tooltipHtml) return;

            tooltipContainer.innerHTML = tooltipHtml;
            tooltipContainer.style.opacity = '1';
            tooltipContainer.style.transform = 'scale(1)';

            positionModalTooltip(e, tooltipContainer, trigger);
        });

        trigger.addEventListener('mouseleave', () => {
            tooltipContainer.style.opacity = '0';
            tooltipContainer.style.transform = 'scale(0.95)';
        });

        trigger.addEventListener('mousemove', (e) => {
            positionModalTooltip(e, tooltipContainer, trigger);
        });
    });
}

/**
 * Position tooltip for modal (same as overall tab)
 */
function positionModalTooltip(e, tooltipContainer, trigger) {
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

// Expose close function to window for onclick handlers
window.closePlayerProfile = closePlayerProfile;
