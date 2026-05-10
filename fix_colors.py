import os
import re

path = 'chatbot/src/index.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace hardcoded blue colors with the CSS variable
# We target common blues used in the project
blue_patterns = [
    r'#0b57d0',
    r'#3b82f6',
    r'#2563eb',
    r'#1d4ed8',
    r'#8b9af3'
]

new_content = content
for pattern in blue_patterns:
    # We only replace if it's a value (after a colon or in a variable definition)
    # But specifically NOT the one in our new :root header
    # To be safe, we replace all and then fix the header
    new_content = re.sub(pattern, 'var(--color-brand-blue)', new_content, flags=re.IGNORECASE)

# Now fix the :root header to have a default value instead of referring to itself
# The header I added was:
# :root {
#   --color-brand-blue: var(--color-brand-blue);
#   ...
# }
# This is bad. It should be:
# :root {
#   --color-brand-blue: #3b82f6;
#   ...
# }

header_fix = """:root {
  --color-brand-blue: #3b82f6;"""

new_content = re.sub(r':root\s*{\s*--color-brand-blue:\s*var\(--color-brand-blue\);', header_fix, new_content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("index.css hardcoded colors replaced with var(--color-brand-blue)")
