import json
import re

# Read the current players.js file
with open('src/js/players.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract the JSON array from the export statement
# Find the array content between the brackets
try:
    # Try to find the array pattern
    match = re.search(r'export const players = (\[[\s\S]*?\]);', content)
    if match:
        json_str = match.group(1)
        data = json.loads(json_str)
        # Handle case where data is nested (e.g., [[{...}, {...}]])
        if isinstance(data, list) and len(data) > 0 and isinstance(data[0], list):
            players = data[0]
        else:
            players = data
    else:
        # Fallback: try to find just the array
        start = content.find('[')
        end = content.rfind(']')
        if start != -1 and end != -1:
            json_str = content[start:end+1]
            data = json.loads(json_str)
            # Handle case where data is nested
            if isinstance(data, list) and len(data) > 0 and isinstance(data[0], list):
                players = data[0]
            else:
                players = data
        else:
            print("Could not find player array")
            exit(1)
except Exception as e:
    print(f"Error parsing JSON: {e}")
    exit(1)

print(f"Found {len(players)} players")

def normalize_tier_value(value):
    """Convert tier string like 'ht1' or 'lt2' to number, or return number/null"""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return int(value)
    if isinstance(value, str):
        # Extract number from strings like 'ht1', 'lt2', 'HT1', 'LT3'
        match = re.match(r'^[hl]t(\d+)$', value.lower())
        if match:
            return int(match.group(1))
        # Try to parse as direct number
        try:
            return int(value)
        except:
            return None
    return None

def normalize_boolean(value):
    """Convert various values to boolean or null"""
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        if value.lower() in ('true', 'yes', '1'):
            return True
        if value.lower() in ('false', 'no', '0'):
            return False
        return None
    if isinstance(value, (int, float)):
        return bool(value)
    return None

gamemodes = ['overall', 'ltm', 'vanilla', 'uhc', 'pot', 'nethop', 'smp', 'sword', 'axe', 'mace']

normalized_players = []

for idx, player in enumerate(players):
    # Basic fields
    normalized = {
        "username": player.get("username") or player.get("name") or None,
        "uuid": player.get("uuid") or player.get("UUID") or None,
        "rank": player.get("rank") if player.get("rank") is not None else None,
        "points": player.get("points") if player.get("points") is not None else None,
        "region": player.get("region") or player.get(" Region") or None,
        "tiers": {}
    }
    
    # Process each gamemode tier
    tiers = player.get("tiers", {})
    for mode in gamemodes:
        mode_tier = tiers.get(mode, {})
        
        current = normalize_tier_value(mode_tier.get("current"))
        peak = normalize_tier_value(mode_tier.get("peak"))
        retired = normalize_boolean(mode_tier.get("retired"))
        
        # If peak is null but current has value, set peak to current
        if peak is None and current is not None:
            peak = current
            
        normalized["tiers"][mode] = {
            "current": current,
            "peak": peak,
            "retired": retired
        }
    
    normalized_players.append(normalized)
    
    if (idx + 1) % 100 == 0:
        print(f"  Processed {idx + 1} players...")

# Generate the output file content
lines = [
    '/**',
    ' * Complete player data with all gamemode tiers',
    ' * Each tier includes: current, peak, and retired (if applicable)',
    ' * Auto-generated from MCTiers API',
    ' */',
    '',
    'export const players = ['
]

for i, player in enumerate(normalized_players):
    player_json = json.dumps(player, indent=4)
    # Indent each line
    indented = '\n'.join('    ' + line for line in player_json.split('\n'))
    lines.append(indented)
    if i < len(normalized_players) - 1:
        lines[-1] = lines[-1] + ','

lines.append('];')

content = '\n'.join(lines)

with open('src/js/players.js', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nSuccessfully normalized {len(normalized_players)} players to src/js/players.js")
