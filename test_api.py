import urllib.request
import json
import sys

url = "https://mctiers.com/api/v2/mode/overall?count=10"
print(f"Testing API: {url}")

try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=15) as response:
        data = json.loads(response.read().decode('utf-8'))
        print(f"✓ Success! Fetched {len(data)} players")
        if data:
            print(f"  Sample: {data[0].get('name')} - {data[0].get('points')} points")
        sys.exit(0)
except Exception as e:
    print(f"✗ Error: {e}")
    sys.exit(1)
