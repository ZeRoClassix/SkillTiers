/**
 * app.js – MCTiers Clone View/Data Controller
 */

import { fetchGamemodes, fetchOverall, fetchGamemodeRankings, fetchPlayerByName, fetchPlayerOverallRank } from './api.js';
import { renderOverallCards, renderGamemodeColumns, renderHome, renderSkeletons, clearGrid, initNewRow } from './render.js';
import { getIcon } from './icons.js';

/* ----------------------------------------------------------
   Constants / Config
   ---------------------------------------------------------- */
const PAGE_SIZE = 9999;
const SEARCH_DEBOUNCE_MS = 200;
const OVERALL_MAX_PLAYERS = 200;

const state = {
  mode: 'home',    // Default to home
  players: [],     // flat list for search/sort mapping
  tierData: {},    // for appending to 5 columns
  page: 0,
  hasMore: true,
  isLoading: false,
};

const $tabsNav      = document.getElementById('tabs-nav');
const $viewContainer= document.getElementById('view-container');
const $errorMsg     = document.getElementById('error-msg');
const $errorText    = document.getElementById('error-text');
const $searchInp    = document.getElementById('search-input');
const $searchClear  = document.getElementById('search-clear');
const $loadBtnWrap  = document.getElementById('load-more-wrapper');
const $loadBtn      = document.getElementById('load-more-btn');

const $spinner      = document.getElementById('loading-spinner');

/* ----------------------------------------------------------
   Initialization
   ---------------------------------------------------------- */
async function init() {
  await loadTabs();
  // Load home by default
  switchView('home');
  
  $searchInp.addEventListener('input', e => {
    clearTimeout(window.searchTimer);
    $searchClear.hidden = !e.target.value;
    window.searchTimer = setTimeout(() => handleSearch(e.target.value), SEARCH_DEBOUNCE_MS);
  });
  
  $searchClear.addEventListener('click', () => {
    $searchInp.value = '';
    $searchClear.hidden = true;
    handleSearch('');
  });

  $loadBtn.addEventListener('click', () => loadPage(true));
  document.getElementById('retry-btn').addEventListener('click', () => loadPage(false));

    // Handle Main Navigation (Home vs Rankings)
  document.querySelectorAll('.site-header .nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const target = e.currentTarget;
      const text = target.innerText.toLowerCase();

      if (text.includes('discords')) {
        e.preventDefault();
        return;
      }

      if (text.includes('home')) {
        e.preventDefault();
        switchView('home');
      } else if (text.includes('rankings') || text.includes('leaderboard')) {
        e.preventDefault();
        switchView('overall');
      }
    });
  });

  // Handle Discord links in the dropdown: stop propagation so site header nav doesn't block them
  document.querySelectorAll('.dropdown-item').forEach(link => {
    link.addEventListener('click', (e) => {
      e.stopPropagation(); 
    });
  });

  // Handle Gamemode Card Clicks on Home Page
  $viewContainer.addEventListener('click', (e) => {
    const card = e.target.closest('.gamemode-card');
    if (card && card.dataset.mode) {
      switchView(card.dataset.mode);
    }
  });
  // Handle Discord link dynamic redirects
  const $discordLink = document.getElementById('discord-link');
  if ($discordLink) {
    $discordLink.addEventListener('click', (e) => {
      e.preventDefault();
      const discordUrls = {
        'vanilla': 'https://discord.com/invite/cpvp',
        'uhc': 'https://discord.com/invite/uhcpvp',
        'pot': 'https://discord.com/invite/potionpvp',
        'nethop': 'https://discord.com/invite/nethop',
        'smp': 'https://discord.com/invite/smptiers',
        'sword': 'https://discord.com/invite/swordtiers',
        'axe': 'https://discord.com/invite/axepvp',
        'mace': 'https://discord.com/invite/mctiers',
        'overall': 'https://discord.com/invite/mctiers'
      };
      
      const currentMode = state.mode || 'overall';
      const discordUrl = discordUrls[currentMode] || 'https://discord.com/invite/mctiers';
      window.open(discordUrl, '_blank');
    });
  }

  // Handle Information Modal
  const $infoBtn = document.getElementById('info-btn');
  const $modalOverlay = document.getElementById('info-modal-overlay');
  const $modalTabs = document.querySelectorAll('.modal-tab-btn');
  const $tabPanes = document.querySelectorAll('.tab-pane');

  if ($infoBtn && $modalOverlay) {
    const $modal = $modalOverlay.querySelector('.info-modal');

    $infoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = $modalOverlay.hidden;
      
      if (isHidden) {
        // Open modal
        $modalOverlay.hidden = false;
        
        // Position it beneath the button
        const rect = $infoBtn.getBoundingClientRect();
        
        // Set top: bottom of button + some gap
        $modal.style.top = `${rect.bottom + window.scrollY + 10}px`;
        
        // Align right edge of modal with right edge of button (providing space if possible)
        const modalWidth = 320;
        let leftPos = rect.right - modalWidth;
        
        if (leftPos < 10) leftPos = 10; // Keep away from left edge
        
        $modal.style.left = `${leftPos}px`;
      } else {
        // Close modal
        $modalOverlay.hidden = true;
      }
    });

    $modalOverlay.addEventListener('click', (e) => {
      if (e.target === $modalOverlay) {
        $modalOverlay.hidden = true;
      }
    });

    // Auto-close modal when scrolling away
    window.addEventListener('scroll', () => {
      if (!$modalOverlay.hidden) {
        $modalOverlay.hidden = true;
      }
    }, { passive: true });
  }

  $modalTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');
      
      // Update active button
      $modalTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Update active pane
      $tabPanes.forEach(pane => {
        if (pane.id === `pane-${targetTab}`) {
          pane.hidden = false;
          pane.classList.add('active');
        } else {
          pane.hidden = true;
          pane.classList.remove('active');
        }
      });
    });
  });
}

async function loadTabs() {
  try {
    const modes = await fetchGamemodes();
    
    // Load Overall icon
    const overallIcon = await getIcon('overall');
    
    $tabsNav.innerHTML = `
      <button class="tab-btn tab-btn-gamemode-overall" data-mode="overall">
        <div class="tab-icon">${overallIcon}</div>
        <span class="tab-text">Overall</span>
      </button>
    `;

    // Load other tab icons asynchronously
    for (const slug of modes) {
      if (slug === 'overall') continue;

      const tabIconHtml = await getIcon(slug);
      // Capitalize first letter for display
      const displayName = slug.charAt(0).toUpperCase() + slug.slice(1);

      $tabsNav.insertAdjacentHTML('beforeend', `
        <button class="tab-btn tab-btn-gamemode-${slug}" data-mode="${slug}">
          <div class="tab-icon">${tabIconHtml}</div>
          <span class="tab-text">${displayName}</span>
        </button>
      `);
    }

    // Add tab indicator
    const $indicator = document.createElement('div');
    $indicator.className = 'tab-indicator';
    $tabsNav.appendChild($indicator);

    $tabsNav.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchView(btn.dataset.mode));
    });

    // Handle window resize to keep indicator aligned
    window.addEventListener('resize', () => {
      const activeBtn = $tabsNav.querySelector('.tab-btn.active');
      if (activeBtn) updateTabIndicator(activeBtn);
    });
  } catch (err) {
    console.error("Tab fetch failed:", err);
  }
}

async function switchView(mode) {
  if (state.isLoading) return;
  state.mode = mode;
  state.page = 0;
  state.hasMore = true;
  state.players = [];
  state.tierData = { "1":[], "2":[], "3":[], "4":[], "5":[] };

  // Update Main Nav Active State
  document.querySelectorAll('.site-header .nav-item').forEach(link => {
    const text = link.textContent.toLowerCase();
    const isHome = mode === 'home';
    link.classList.toggle('active', (isHome && text.includes('home')) || (!isHome && (text.includes('rankings') || text.includes('leaderboard'))));
  });

  // Toggle Gamemode Sub-Nav and Search visibility
  $tabsNav.style.display = (mode === 'home') ? 'none' : 'flex';
  const $searchWrapper = document.querySelector('.search-wrapper');
  if ($searchWrapper) {
    $searchWrapper.style.display = (mode === 'home') ? 'none' : 'block';
  }

  $tabsNav.querySelectorAll('.tab-btn').forEach(b => {
    const isActive = b.dataset.mode === mode;
    b.classList.toggle('active', isActive);
    if (isActive && $tabsNav.style.display !== 'none') updateTabIndicator(b);
  });

  $errorMsg.hidden = true;
  $spinner.hidden = false;
  clearGrid($viewContainer);

  if (mode === 'home') {
    await renderHome($viewContainer);
    state.isLoading = false;
    $spinner.hidden = true;
    $loadBtnWrap.hidden = true;
    return;
  }

  await loadPage(false);
}

/* ----------------------------------------------------------
   Page Loading
   ---------------------------------------------------------- */
async function loadPage(append = false) {
  if (state.isLoading || !state.hasMore) return;
  state.isLoading = true;
  if (append) $loadBtn.textContent = "Loading...";

  const from = state.page * PAGE_SIZE;

  try {
    if (state.mode === 'overall') {
      const data = await fetchOverall(PAGE_SIZE, from);
      if (!data || data.length === 0) {
        state.hasMore = false;
      } else {
        // Limit overall leaderboard to top 200 players
        const currentTotal = state.players.length;
        const remainingSlots = OVERALL_MAX_PLAYERS - currentTotal;
        
        if (remainingSlots <= 0) {
          state.hasMore = false;
        } else {
          const limitedData = data.slice(0, remainingSlots);
          state.players.push(...limitedData);
          await renderOverallCards(limitedData, $viewContainer, append, from + 1);
          
          // Stop loading if we reached max or got less data than requested
          if (state.players.length >= OVERALL_MAX_PLAYERS || data.length < PAGE_SIZE) {
            state.hasMore = false;
          }
        }
      }
    } else {
      const data = await fetchGamemodeRankings(state.mode, PAGE_SIZE, from);
      let totalFetched = 0;
      for (let t = 1; t <= 5; t++) {
        const items = data[String(t)] || [];
        state.tierData[String(t)].push(...items);
        totalFetched += items.length;
      }
      renderGamemodeColumns(data, state.mode, $viewContainer, append);
      
      const allShort = Object.values(data).every(arr => arr.length < PAGE_SIZE);
      if (allShort || totalFetched === 0) state.hasMore = false;
    }
    state.page++;
    $errorMsg.hidden = true;
  } catch (e) {
    $errorText.textContent = "Error: " + e.message;
    $errorMsg.hidden = false;
    if (!append) clearGrid($viewContainer);
  } finally {
    state.isLoading = false;
    $spinner.hidden = true;
    $loadBtn.textContent = "Load More";
    $loadBtnWrap.hidden = !state.hasMore;
    
    if (state.mode === 'overall') {
      document.querySelectorAll('.mctiers-player-row').forEach(c => c.style.opacity = '1');
    }
    
    // Ensure indicator is correct after content loads (in case of layout shifts)
    const activeBtn = $tabsNav.querySelector('.tab-btn.active');
    if (activeBtn) updateTabIndicator(activeBtn);
  }
}

/* ----------------------------------------------------------
   Tab Indicator Position Helper
   ---------------------------------------------------------- */
function updateTabIndicator(btn) {
  const $indicator = $tabsNav.querySelector('.tab-indicator');
  if (!$indicator) return;

  $indicator.style.width = `${btn.offsetWidth}px`;
  $indicator.style.left = `${btn.offsetLeft}px`;
}

/* ----------------------------------------------------------
   Local Search (Overall Mode Only fallback to dimming)
   ---------------------------------------------------------- */
async function handleSearch(query) {
  const norm = query.toLowerCase().trim();

  if (state.mode === 'overall') {
    // Remove any previously injected out-of-top200 row
    const existingExtra = $viewContainer.querySelector('.search-extra-row');
    if (existingExtra) existingExtra.remove();

    const rows = $viewContainer.querySelectorAll('.mctiers-player-row');
    let foundInTop200 = false;

    rows.forEach(r => {
      const name = r.dataset.name || '';
      if (!norm || name.includes(norm)) {
        r.style.display = 'grid';
        if (norm && name.includes(norm)) foundInTop200 = true;
      } else {
        r.style.display = 'none';
      }
    });

    // If a non-empty query matched nothing in the top 200, search full list
    if (norm && !foundInTop200) {
      const result = await fetchPlayerOverallRank(norm);
      if (result) {
        const { rank, player } = result;
        const isOutsideTop200 = rank > OVERALL_MAX_PLAYERS;

        // Build the row HTML using the already-imported renderOverallCards
        const tempDiv = document.createElement('div');
        await renderOverallCards([player], tempDiv, false, rank);

        // Get the rendered row
        const renderedRow = tempDiv.querySelector('.mctiers-player-row');
        if (renderedRow) {
          // Wrap in a container div with special class
          const wrapper = document.createElement('div');
          wrapper.className = 'search-extra-row';

          if (isOutsideTop200) {
            // Override rank display to ensure it shows the pure rank
            const rankEl = renderedRow.querySelector('.player-rank');
            if (rankEl) rankEl.textContent = `${rank}`;
            const rankShimmer = renderedRow.querySelector('.rank-in-shimmer');
            if (rankShimmer) rankShimmer.textContent = `${rank}`;

            const notice = document.createElement('div');
            notice.className = 'outside-top200-notice';
            notice.textContent = `#${rank} overall — outside top ${OVERALL_MAX_PLAYERS}`;
            wrapper.appendChild(notice);
          }

          wrapper.appendChild(renderedRow);
          $viewContainer.appendChild(wrapper);

          // Re-init tooltips & click handlers for the new row
          initNewRow(renderedRow);
        }
      }
    }
  } else {
    // Basic filtering inside the grid format
    const rows = $viewContainer.querySelectorAll('.gm-player-row');
    rows.forEach(r => {
      const name = r.querySelector('.gm-row-name').textContent.toLowerCase();
      if (!norm || name.includes(norm)) {
        r.style.display = 'flex';
      } else {
        r.style.display = 'none';
      }
    });
  }
}

// Start app
init();

// Initialize player profile modal
import('./playerProfile.js').then(module => {
  module.initPlayerProfileModal();
});
