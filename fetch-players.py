import urllib.request
import json
import time

gamemodes = ['overall', 'ltm', 'vanilla', 'uhc', 'pot', 'nethop', 'smp', 'sword', 'axe', 'mace']

def format_tier(tier):
    if not tier:
        return None
    tier = str(tier).lower()
    import re
    match = re.match(r'(high|low)_tier_(\d+)', tier, re.IGNORECASE)
    if match:
        prefix = 'HT' if match.group(1).lower() == 'high' else 'LT'
        return f"{prefix}{match.group(2)}"
    if re.match(r'^[hl]t\d+$', tier):
        return tier.upper()
    return None

def convert_tier(tier_data):
    if not tier_data:
        return {'current': None, 'peak': None, 'retired': None}
    if isinstance(tier_data, str):
        formatted = format_tier(tier_data)
        return {'current': formatted, 'peak': formatted, 'retired': None}
    if isinstance(tier_data, dict):
        current = format_tier(tier_data.get('tier') or tier_data.get('current'))
        peak = format_tier(tier_data.get('best') or tier_data.get('peak') or tier_data.get('tier') or tier_data.get('current'))
        retired = format_tier(tier_data.get('retired'))
        return {'current': current, 'peak': peak or current, 'retired': retired}
    return {'current': None, 'peak': None, 'retired': None}

def format_value(value):
    if value is None:
        return 'null'
    return f'"{value}"'

def fetch_mode_data(mode, count=1000, max_retries=3):
    """Fetch all players for a specific gamemode with retry logic"""
    print(f"  Fetching {mode} rankings...")
    all_players = []
    offset = 0
    batch_size = 50  # API limit
    retries = 0
    
    while len(all_players) < count:
        try:
            url = f"https://mctiers.com/api/v2/mode/{mode}?count={batch_size}&offset={offset}"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            
            with urllib.request.urlopen(req, timeout=120) as response:
                data = json.loads(response.read().decode('utf-8'))
            
            # Validate data is a list
            if not isinstance(data, list):
                print(f"    Warning: Invalid response format for {mode}: {type(data)}")
                if retries < max_retries:
                    retries += 1
                    time.sleep(2 ** retries)  # Exponential backoff
                    continue
                break
            
            if not data:
                break
            
            all_players.extend(data)
            retries = 0  # Reset retries on success
            
            if len(data) < batch_size:
                break
            
            offset += batch_size
            time.sleep(0.5)  # Slightly longer delay to avoid rate limiting
            
        except Exception as e:
            print(f"    Warning: Error fetching {mode} at offset {offset}: {e}")
            if retries < max_retries:
                retries += 1
                print(f"    Retrying {mode} (attempt {retries}/{max_retries})...")
                time.sleep(2 ** retries)  # Exponential backoff
                continue
            break
    
    print(f"    Got {len(all_players)} players for {mode}")
    return all_players

def main():
    try:
        print("Fetching player data from all gamemodes...")
        
        # Fetch data from all gamemodes with longer delay between each
        mode_data = {}
        for i, mode in enumerate(gamemodes):
            mode_data[mode] = fetch_mode_data(mode, count=1000)
            # Longer delay between gamemodes to avoid rate limiting
            if i < len(gamemodes) - 1:
                time.sleep(2)
        
        # Check if overall data was fetched successfully
        if not mode_data.get('overall') or len(mode_data['overall']) == 0:
            print("ERROR: Could not fetch overall rankings. Aborting.")
            return
        
        overall_players = mode_data['overall']
        total_players = len(overall_players)
        
        print(f"\nProcessing {total_players} players with tier data from all gamemodes...")
        
        # Build mode lookup dictionaries for faster access
        mode_lookups = {}
        for mode in gamemodes:
            mode_lookups[mode] = {}
            for player in mode_data[mode]:
                # Ensure player is a dict, not a string or other type
                if not isinstance(player, dict):
                    print(f"    Warning: Invalid player data type in {mode}: {type(player)}")
                    continue
                username = player.get('name') or player.get('username')
                if username:
                    mode_lookups[mode][username] = player
        
        players = []
        for index, player in enumerate(overall_players):
            rank = index + 1
            username = player.get('name') or player.get('username')
            
            # Build tiers object for each gamemode
            tiers = {}
            for mode in gamemodes:
                mode_player = mode_lookups[mode].get(username)
                if mode_player:
                    # Extract tier data from the mode-specific player data
                    tier_data = mode_player.get('tier') or mode_player.get('current')
                    tiers[mode] = convert_tier(tier_data)
                else:
                    # Player not ranked in this mode
                    tiers[mode] = {'current': None, 'peak': None, 'retired': None}
            
            player_obj = {
                'username': username,
                'uuid': '',
                'points': player.get('points', 0),
                'rank': rank,
                'region': player.get('region', 'NA'),
                'tiers': tiers
            }
            players.append(player_obj)
            
            if (index + 1) % 100 == 0:
                print(f"  Processed {index + 1}/{total_players} players...")
        
        print(f"\nGenerating players.js file...")
        
        # Generate file content
        lines = [
            '/**',
            ' * Complete player data with all gamemode tiers',
            ' * Each tier includes: current, peak, and retired (if applicable)',
            ' * Auto-generated from MCTiers API',
            ' */',
            '',
            'export const players = ['
        ]
        
        for i, p in enumerate(players):
            username = p['username']
            uuid = p['uuid']
            points = p['points']
            rank = p['rank']
            region = p['region']
            
            player_block = f'''  {{
    username: "{username}",
    uuid: "{uuid}",
    points: {points},
    rank: {rank},
    region: "{region}",
    tiers: {{
      overall: {{ current: {format_value(p["tiers"]["overall"]["current"])}, peak: {format_value(p["tiers"]["overall"]["peak"])}, retired: {format_value(p["tiers"]["overall"]["retired"])} }},
      ltm: {{ current: {format_value(p["tiers"]["ltm"]["current"])}, peak: {format_value(p["tiers"]["ltm"]["peak"])}, retired: {format_value(p["tiers"]["ltm"]["retired"])} }},
      vanilla: {{ current: {format_value(p["tiers"]["vanilla"]["current"])}, peak: {format_value(p["tiers"]["vanilla"]["peak"])}, retired: {format_value(p["tiers"]["vanilla"]["retired"])} }},
      uhc: {{ current: {format_value(p["tiers"]["uhc"]["current"])}, peak: {format_value(p["tiers"]["uhc"]["peak"])}, retired: {format_value(p["tiers"]["uhc"]["retired"])} }},
      pot: {{ current: {format_value(p["tiers"]["pot"]["current"])}, peak: {format_value(p["tiers"]["pot"]["peak"])}, retired: {format_value(p["tiers"]["pot"]["retired"])} }},
      nethop: {{ current: {format_value(p["tiers"]["nethop"]["current"])}, peak: {format_value(p["tiers"]["nethop"]["peak"])}, retired: {format_value(p["tiers"]["nethop"]["retired"])} }},
      smp: {{ current: {format_value(p["tiers"]["smp"]["current"])}, peak: {format_value(p["tiers"]["smp"]["peak"])}, retired: {format_value(p["tiers"]["smp"]["retired"])} }},
      sword: {{ current: {format_value(p["tiers"]["sword"]["current"])}, peak: {format_value(p["tiers"]["sword"]["peak"])}, retired: {format_value(p["tiers"]["sword"]["retired"])} }},
      axe: {{ current: {format_value(p["tiers"]["axe"]["current"])}, peak: {format_value(p["tiers"]["axe"]["peak"])}, retired: {format_value(p["tiers"]["axe"]["retired"])} }},
      mace: {{ current: {format_value(p["tiers"]["mace"]["current"])}, peak: {format_value(p["tiers"]["mace"]["peak"])}, retired: {format_value(p["tiers"]["mace"]["retired"])} }}
    }}
  }}'''
            lines.append(player_block)
            
            # Add comma after each player except the last
            if i < len(players) - 1:
                lines[-1] = lines[-1] + ','
        
        lines.append('];')
        
        content = '\n'.join(lines)
        
        with open('src/js/players.js', 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"\n[OK] Successfully wrote {len(players)} players to src/js/players.js")
        print(f"  Players ranked 1 to {len(players)}")
        
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
