# Skill Tiers - Competitive PvP Rankings
 
## 👤 Project Ownership
 
**This project is completely owned, designed, and developed by Classix (you).**
 
All HTML, CSS, and JavaScript code in this repository was personally written by Classix. This includes:
- All frontend structure (`src/index.html`)
- All styling (`src/CSS/style.css`)
- All JavaScript logic (`src/js/*.js`)
- Player data structure and tier definitions (`src/js/players.js`)
 
This is a solo-developed project with no third-party code contributors.
 
---
 
## 📋 What This Site Is For
 
**Skill Tiers** is a competitive PvP leaderboard website for Minecraft players. It ranks players across different PvP gamemodes (Vanilla, UHC, Pot, Nethop, SMP, Sword, Axe, Mace) based on their skill tiers.
 
### Purpose:
- **Track competitive PvP rankings** across multiple gamemodes
- **Display player statistics** including current tier, peak tier, points, win/loss ratios
- **Provide a tier testing system** where players can get officially ranked by battling testers
- **Community hub** connecting players to Discord servers for their preferred gamemodes
- **Transparency** in how players are ranked and what it takes to reach higher tiers
 
### Core Features:
- **Home Page**: Explains gamemodes, tier system, and how to get tested
- **Rankings Page**: Interactive leaderboard with search, sorting, and filtering
- **Player Profiles**: Detailed view showing all gamemode stats for individual players
- **Dynamic Discord Links**: Links to gamemode-specific Discord servers
- **Responsive Design**: Works on desktop and mobile
- **Smooth Animations**: Fade-in effects, hover glows, and modal transitions
 
---
 
## 🗂️ Project Structure
 
```
Leaderboard2/
├── src/
│   ├── CSS/
│   │   └── style.css          # All styling (3000+ lines)
│   ├── js/
│   │   ├── app.js             # Main app logic, tab switching, state management
│   │   ├── render.js          # DOM rendering functions, leaderboard display
│   │   ├── playerProfile.js   # Player profile modal functionality
│   │   ├── players.js         # Player data (300k+ lines of tier data)
│   │   ├── api.js             # API integration with MCTiers
│   │   └── icons.js           # SVG icon definitions
│   ├── index.html             # Main HTML structure
│   └── assets/
│       ├── tabs/              # Gamemode SVG icons
│       └── skins/             # Player skin images
├── fix-retired.js             # Node.js script to fix retired player tiers
├── webpack.config.js          # Build configuration
└── package.json               # Dependencies
```
 
---
 
## 🎨 Where & How to Edit
 
### 1. **Editing Player Data**
**File**: `src/js/players.js`
 
This file contains all player tier information. Structure for each player:
 
```javascript
{
  "id": "player_uuid",
  "name": "PlayerName",
  "points": 1500,
  "rank": 1,
  "region": "NA",
  "gamemodeStats": {
    "vanilla": { "wins": 100, "losses": 50, "matches": 150 },
    // ... other gamemodes
  },
  "tiers": {
    "overall": { "current": "HT2", "peak": "HT2", "retired": false },
    "vanilla": { "current": null, "peak": "HT1", "retired": true },
    "uhc": { "current": "HT3", "peak": "HT3", "retired": false }
    // ... other gamemodes
  }
}
```
 
**Important**: If `retired: true`, set `current: null` to show "N/A"
 
**To batch-fix retired players**, run:
```bash
node fix-retired.js
```
 
---
 
### 2. **Editing Styling**
**File**: `src/CSS/style.css`
 
Key sections to know:
 
| Section | Lines | What It Controls |
|---------|-------|------------------|
| Variables | 1-50 | Colors, fonts, spacing |
| Layout | 50-180 | Grid, container, navbar |
| Search | 185-267 | Search bar styling |
| Gamemode Tabs | 277-355 | Ranking page tabs |
| Gamemode Cards | 1310-1478 | Home page gamemode cards |
| Tables | 1478-1600 | Leaderboard table styling |
| Player Profile Modal | 2914-2971 | Modal animations |
| Hero Card | 1342-1387 | Welcome section on home page |
 
**Editing Gradients** (for gamemode colors):
Look for classes like `.gamemode-card-vanilla`, `.gamemode-card-uhc`, etc.
 
Example:
```css
.gamemode-card-vanilla::before {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 50%, #c73e3e 100%);
}
```
 
---
 
### 3. **Editing HTML Structure**
**File**: `src/index.html`
 
Key sections:
 
| Element | Lines | Purpose |
|---------|-------|---------|
| `<nav>` | ~15-50 | Navigation bar |
| `.home-container` | ~200-400 | Home tab content |
| `.rankings-container` | ~400-600 | Rankings tab content |
| `#player-profile-modal` | ~600-700 | Player profile modal |
 
**To change page title or favicon**:
```html
<title>Skill Tiers | Competitive PvP Rankings</title>
<link rel="icon" href="../MAIN ICON/google icon.png" type="image/png">
```
 
---
 
### 4. **Editing JavaScript Logic**
 
**`src/js/app.js`** - Main Application Logic
- Lines 1-50: State management
- Lines 50-100: Tab switching
- Lines 100-150: Search functionality
- Lines 150-200: Gamemode tab handling
- Lines ~87-108: Discord link dynamic redirects
 
**`src/js/render.js`** - Rendering Functions
- Lines 1-100: Leaderboard rendering
- Lines 100-200: Player row rendering
- Lines 200-300: Home page gamemode cards
- Lines ~305: Hero section logo
 
**`src/js/playerProfile.js`** - Player Profile Modal
- Lines 1-50: Tier icon SVGs
- Lines 50-100: Modal open/close with animations
- Lines 100-150: Player data display
 
---
 
### 5. **Adding a New Gamemode**
 
To add a new gamemode:
 
1. **Add to gamemodes array** in `src/js/players.js`:
```javascript
export const gamemodes = [
  'overall',
  'vanilla',
  'newgamemode',  // Add here
  // ...
];
```
 
2. **Add SVG icon** in `src/assets/tabs/newgamemode.svg`
 
3. **Add CSS** in `src/CSS/style.css`:
```css
/* Tab button */
.tab-btn-gamemode-newgamemode.active {
  background: linear-gradient(135deg, #color1, #color2, #color3);
}
 
/* Gamemode card */
.gamemode-card-newgamemode::before {
  background: linear-gradient(135deg, #color1, #color2, #color3);
}
```
 
4. **Add Discord link** in `src/js/app.js`:
```javascript
const discordUrls = {
  'newgamemode': 'https://discord.com/invite/yourinvite',
  // ... existing
};
```
 
5. **Update player data** to include the new gamemode tier for each player
 
---
 
## 🚀 How to Use the Site
 
### For Visitors:
1. **Home Tab**: Read about gamemodes, tier system, and how to get tested
2. **Rankings Tab**: Browse the leaderboard, click gamemode tabs to filter
3. **Search**: Type a player name to find them quickly
4. **Player Profiles**: Click any player row to see detailed stats
5. **Discord**: Click the Discord icon to join the gamemode-specific server
 
### For Developers (You):
 
**Running Locally**:
```bash
# Install dependencies
npm install
 
# Start development server
npm run dev
 
# Or just open src/index.html directly in browser
```
 
**Updating Player Data**:
1. Edit `src/js/players.js` directly
2. Or use the fix-retired.js script for batch updates
3. Refresh browser to see changes
 
**Changing Colors/Styles**:
1. Edit `src/CSS/style.css`
2. Find the relevant section by searching for class names
3. Refresh browser to see changes
 
**Adding Content**:
1. HTML changes: Edit `src/index.html`
2. Dynamic content: Edit relevant JS file (app.js, render.js, etc.)
3. Refresh browser to see changes
 
---
 
## ⚙️ How Everything Works
 
### State Management (`app.js`)
The app uses a central state object:
```javascript
const state = {
  mode: 'overall',      // Current gamemode
  players: [],          // Player data
  view: 'home',         // Current view (home/rankings)
  searchQuery: '',      // Search input
  sortBy: 'points'      // Sort criteria
};
```
 
### Rendering Flow
1. **Init**: Load player data → Render home view
2. **Tab Switch**: Update `state.view` → Re-render container
3. **Gamemode Change**: Update `state.mode` → Re-render leaderboard
4. **Search**: Filter `state.players` → Re-render table
5. **Player Click**: Find player → Open modal with animation
 
### Tier System Logic
- **Tiers**: HT1 (highest) → LT5 (lowest)
- **HT**: High Tier (HT1-HT5)
- **LT**: Low Tier (LT1-LT5)
- **Current**: Player's current tier (or null if retired)
- **Peak**: Highest tier ever achieved
- **Points**: Calculated from tier and performance
 
### Modal Animation System
```javascript
// Opening
overlay.classList.add('active');
modal.classList.add('active');
 
// Closing
modal.classList.add('closing');
setTimeout(() => {
  overlay.classList.remove('active');
  modal.classList.remove('active', 'closing');
}, 300);
```
 
### Discord Link System
Dynamic based on `state.mode`:
- Reads `state.mode` when clicked
- Opens corresponding Discord invite in new tab
- Falls back to main MCTiers Discord if mode not found
 
---
 
## 🔧 Common Tasks
 
### Change a Player's Tier
1. Open `src/js/players.js`
2. Find the player by name (Ctrl+F)
3. Edit their tier object:
```javascript
"vanilla": {
  "current": "HT2",      // Change this
  "peak": "HT1",         // And this if needed
  "retired": false       // Set to true if retired
}
```
 
### Change Gamemode Colors
1. Open `src/CSS/style.css`
2. Find `.gamemode-card-{gamemode}` classes
3. Edit the `background` gradient values
 
### Add a New Player
1. Copy an existing player object
2. Change the `id`, `name`, and all stats
3. Add to the `players` array
4. Ensure they have tier data for all gamemodes
 
### Fix Retired Players
Run the included script:
```bash
node fix-retired.js
```
This sets `current: null` for all tiers where `retired: true`.
 
---
 
## 📱 Responsive Breakpoints
 
| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 768px | Stack layout, hide some columns |
| Tablet | 768-1024px | Adjusted grid |
| Desktop | > 1024px | Full layout |
 
Edit in `src/CSS/style.css` - search for `@media` queries.
 
---
 
## 🎨 Design System
 
### Colors
- **Primary**: `#f59e0b` (Amber/Yellow)
- **Background**: `#0f1419` (Dark)
- **Surface**: `#151a25` (Card backgrounds)
- **Text**: `#e2e8f0` (Light gray)
- **Borders**: `rgba(255,255,255,0.1)` (Subtle white)
 
### Fonts
- **Primary**: Inter, sans-serif
- **Monospace**: JetBrains Mono (for stats)
 
### Spacing
- **Container max-width**: 1400px
- **Card padding**: 1.5rem
- **Section gap**: 3rem
- **Border radius**: 16px (cards), 12px (buttons)
 
---
 
## 📝 Notes for Future Development
 
1. **Data Updates**: Always run `fix-retired.js` after bulk editing players.js
2. **Testing**: Check both light and dark modes (if implemented)
3. **Performance**: Don't load all player data on home tab
4. **Accessibility**: Maintain focus outlines and ARIA labels
5. **Mobile**: Test touch interactions on actual devices
 
---
 
## 📞 Support
 
For questions about this codebase, refer to:
- This README
- Code comments in each file
- The structure documented above
 
**Remember**: You built this. You own this. You know it better than anyone.
 
---
 
*Last updated: April 2026*
*Author: Classix*
*Project: Skill Tiers - Competitive PvP Rankings*
