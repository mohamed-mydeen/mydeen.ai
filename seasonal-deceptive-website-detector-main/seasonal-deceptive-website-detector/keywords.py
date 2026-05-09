# keywords.py
"""
Scam Keyword Database
Contains language-specific keywords commonly used in deceptive websites
"""

# Tamil scam keywords - Regional language support for Indian users
TAMIL_SCAM_KEYWORDS = [
    "இலவச",           # Free
    "பரிசு",           # Gift/Prize
    "உடனே",           # Immediately
    "பகிரவும்",        # Share
    "இப்போது",         # Now
    "கிளிக்",          # Click
    "பெறுங்கள்",       # Receive/Get
    "வெற்றி",          # Victory/Win
    "வரையறுக்கப்பட்ட", # Limited
    "இன்றே",          # Today
    "வாய்ப்பு",        # Opportunity
    "ரூபாய்",          # Rupees
    "லட்சம்",          # Lakh
    "பணம்",            # Money
    "அவசரம்",          # Urgent
    "கடைசி",           # Last
    "முடியும்",         # Can/Will
    "உறுதி",           # Confirm
    "பதிவு",           # Registration
    "முழுமை"           # Complete
]

# English scam keywords - Common phishing patterns
ENGLISH_SCAM_KEYWORDS = [
    "free gift",
    "claim now",
    "limited time",
    "urgent",
    "only today",
    "congratulations",
    "winner",
    "cash prize",
    "share with friends",
    "whatsapp",
    "click here",
    "instant",
    "guaranteed",
    "act now",
    "expires today",
    "last chance",
    "exclusive offer",
    "100% free",
    "no cost",
    "verify now",
    "confirm identity",
    "account suspended",
    "unusual activity",
    "security alert",
    "reset password",
    "update payment"
]

# Psychological trigger phrases - Exploit cognitive biases
PSYCHOLOGICAL_TRIGGERS = [
    "limited offer",
    "hurry up",
    "don't miss",
    "only few left",
    "ending soon",
    "before it's too late",
    "once in lifetime",
    "exclusive access",
    "selected users",
    "you have been chosen"
]

# Suspicious URL patterns
SUSPICIOUS_URL_PATTERNS = [
    "bit.ly",
    "tinyurl",
    "goo.gl",
    "ow.ly",
    "short.link",
    "free",
    "winner",
    "prize",
    "offer",
    "gift",
    "claim",
    "urgent",
    "secure-",
    "verify-",
    "login-",
    "account-update"
]

# Trusted domain extensions (less likely to be scams)
TRUSTED_EXTENSIONS = [
    ".gov", ".edu", ".org", ".mil",".net",".com",".in"
]

# High-risk domain extensions (commonly used in scams)
RISKY_EXTENSIONS = [
    ".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".pw",".loan",".site",".click"
]