import os

path = 'chatbot/src/index.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports and root variables at the top
header = """@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&family=Lexend:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Playfair+Display:wght@400;700&family=JetBrains+Mono:wght@400;700&display=swap');

:root {
  --color-brand-blue: #3b82f6;
  --font-main: 'Inter', sans-serif;
}

body {
  font-family: var(--font-main) !important;
}

/* Premium Controls Styles */
.color-pills-container {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}

.color-pill {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.color-pill:hover {
  transform: scale(1.15);
}

.color-pill.active {
  border-color: #ffffff;
  transform: scale(1.1);
  box-shadow: 0 0 0 2px var(--color-brand-blue);
}

.premium-select-wrapper {
  position: relative;
  width: 180px;
}

.premium-select {
  appearance: none;
  width: 100%;
  padding: 10px 36px 10px 14px;
  background: var(--color-surface-container-high);
  border: 1px solid var(--color-outline-variant);
  border-radius: 10px;
  color: var(--color-on-surface);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.premium-select:hover {
  border-color: var(--color-brand-blue);
  background: var(--color-surface-container-highest);
}

.premium-select-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  font-size: 18px;
  color: var(--color-on-surface-variant);
}

"""

with open(path, 'w', encoding='utf-8') as f:
    f.write(header + content)

print("index.css updated successfully")
