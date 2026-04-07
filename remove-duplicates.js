const fs = require('fs');

// Read the players file
const fileContent = fs.readFileSync('src/js/players.js', 'utf8');
const players = JSON.parse(fileContent.replace('export const players = ', ''));

// Find duplicates by username
const seen = new Set();
const duplicates = [];
const uniquePlayers = [];

players.forEach(player => {
  const username = player.username;
  if (seen.has(username)) {
    duplicates.push(username);
  } else {
    seen.add(username);
    uniquePlayers.push(player);
  }
});

console.log('Found duplicates:', duplicates);
console.log('Total players before:', players.length);
console.log('Total players after:', uniquePlayers.length);
console.log('Duplicates removed:', duplicates.length);

// Write back unique players
const content = `/**
 * Complete player data with all gamemode tiers
 * Each tier includes: current, peak, and retired (if applicable)
 * Auto-generated from MCTiers API
 */

export const players = ${JSON.stringify(uniquePlayers, null, 4)};
`;

fs.writeFileSync('src/js/players.js', content);
console.log('File updated successfully!');
