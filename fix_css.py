import os

path = 'chatbot/src/index.css'
with open(path, 'rb') as f:
    content = f.read()

# Find the start of the corrupted section
marker = b'@keyframes spin {'
pos = content.rfind(marker)

if pos != -1:
    # Keep everything up to the marker
    new_content = content[:pos]
    
    # Append the clean final section
    final_section = b"""@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.options-drawer.closing {
  animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.options-overlay.closing {
  animation: fadeOut 0.2s ease-out forwards;
}

@keyframes slideDown {
  from { transform: translateY(0); }
  to { transform: translateY(100%); }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

.small-wave {
  display: inline-flex !important;
  margin-left: 8px;
  transform: scale(0.7);
  transform-origin: left center;
}

.pulse-icon {
  animation: iconPulse 2s infinite ease-in-out;
}

@keyframes iconPulse {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
}

.premium-transition {
  animation: fadeIn 0.4s ease-out;
}
"""
    with open(path, 'wb') as f:
        f.write(new_content + final_section)
    print("CSS fixed successfully")
else:
    print("Marker not found")
