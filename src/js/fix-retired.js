const fs = require('fs');
let content = fs.readFileSync('src/js/players.js', 'utf8');

// Pattern to match tier blocks with retired: true and a current value
// Looks for: current: "XXX", followed by peak and retired: true
content = content.replace(
  /"current":\s*"[^"]+",(\s*\n\s*"peak":[^,]+,\s*\n\s*"retired":\s*true)/g,
  '"current": null,$1'
);

fs.writeFileSync('src/js/players.js', content);
console.log('Updated players.js - set current: null for all retired tiers');
