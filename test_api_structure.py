import urllib.request
import json

url = "https://mctiers.com/api/v2/mode/overall?count=5"
print(f"Testing API: {url}")

try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=30) as response:
        data = json.loads(response.read().decode('utf-8'))
        print(f"Success! Fetched {len(data)} players\n")
        
        if data:
            player = data[0]
            print(f"Sample player structure:")
            print(json.dumps(player, indent=2))
            
            print(f"\n\nPlayer keys: {list(player.keys())}")
            
            # Check for tiers in different possible locations
            if 'tier' in player:
                print(f"\ntier field: {player['tier']}")
            if 'tiers' in player:
                print(f"\ntiers field: {json.dumps(player['tiers'], indent=2)}")
            if 'gamemodes' in player:
                print(f"\ngamemodes field: {json.dumps(player['gamemodes'], indent=2)}")
                
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
