import base64
import os

os.makedirs("src/img", exist_ok=True)

# 1x1 transparent PNG
b64_img = b"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAANSURBVBhXY3jP4PgfAAWpA50G6J9+AAAAAElFTkSuQmCC"

with open("src/img/default.png", "wb") as f:
    f.write(base64.b64decode(b64_img))

print("Created src/img/default.png")
