# url_checker.py
"""
URL Pattern Analysis Module
Analyzes URL structure for suspicious patterns without making network requests
"""

from urllib.parse import urlparse
from keywords import SUSPICIOUS_URL_PATTERNS, TRUSTED_EXTENSIONS, RISKY_EXTENSIONS

def analyze_url(url):
    """
    Analyzes URL structure for deceptive patterns
    
    Returns:
        dict: {
            'risk_score': int (0-30),
            'issues': list of detected issues,
            'details': dict of specific findings
        }
    """
    risk_score = 0
    issues = []
    details = {}
    
    try:
        # Parse the URL
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        path = parsed.path.lower()
        full_url = url.lower()
        
        # 1. URL Length Check (Phishing URLs are often long)
        url_length = len(url)
        details['url_length'] = url_length
        if url_length > 75:
            risk_score += 10
            issues.append(f"Unusually long URL ({url_length} characters)")
        elif url_length > 54:
            risk_score += 5
            issues.append(f"Long URL ({url_length} characters)")
        
        # 2. Check for IP address instead of domain name
        if domain.replace('.', '').isdigit():
            risk_score += 15
            issues.append("Uses IP address instead of domain name (highly suspicious)")
        
        # 3. Suspicious subdomain count (multiple dots indicate subdomains)
        dot_count = domain.count('.')
        details['subdomain_count'] = dot_count - 1 if dot_count > 0 else 0
        if dot_count > 3:
            risk_score += 10
            issues.append(f"Multiple subdomains detected ({dot_count} levels)")
        elif dot_count > 2:
            risk_score += 5
            issues.append("Has subdomain")
        
        # 4. Check for @ symbol (can redirect to different domain)
        if '@' in url:
            risk_score += 15
            issues.append("Contains '@' symbol (redirection trick)")
        
        # 5. Check for suspicious URL patterns
        detected_patterns = []
        for pattern in SUSPICIOUS_URL_PATTERNS:
            if pattern in full_url:
                detected_patterns.append(pattern)
        
        if detected_patterns:
            risk_score += len(detected_patterns) * 3
            issues.append(f"Suspicious keywords in URL: {', '.join(detected_patterns)}")
            details['suspicious_patterns'] = detected_patterns
        
        # 6. Domain extension check
        domain_ext = '.' + domain.split('.')[-1] if '.' in domain else ''
        details['domain_extension'] = domain_ext
        
        if domain_ext in TRUSTED_EXTENSIONS:
            risk_score -= 10  # Reduce risk for trusted extensions
            details['domain_trust'] = 'trusted'
        elif domain_ext in RISKY_EXTENSIONS:
            risk_score += 12
            issues.append(f"High-risk domain extension: {domain_ext}")
            details['domain_trust'] = 'risky'
        else:
            details['domain_trust'] = 'neutral'
        
        # 7. Check for URL shorteners (often hide actual destination)
        shorteners = ['bit.ly', 'tinyurl', 'goo.gl', 'ow.ly', 't.co', 'short.link']
        if any(shortener in domain for shortener in shorteners):
            risk_score += 12
            issues.append("URL shortener detected (hides real destination)")
        
        # 8. Check for excessive hyphens (common in phishing)
        hyphen_count = domain.count('-')
        details['hyphen_count'] = hyphen_count
        if hyphen_count > 3:
            risk_score += 8
            issues.append(f"Excessive hyphens in domain ({hyphen_count})")
        elif hyphen_count > 1:
            risk_score += 3
            issues.append(f"Multiple hyphens in domain ({hyphen_count})")
        
        # 9. Check for numbers in domain (suspicious if many)
        digit_count = sum(c.isdigit() for c in domain)
        details['digit_count'] = digit_count
        if digit_count > 4:
            risk_score += 6
            issues.append(f"Many numbers in domain ({digit_count})")
        
        # Cap the risk score at 30 (max for URL analysis)
        risk_score = min(risk_score, 30)
        
        return {
            'risk_score': risk_score,
            'issues': issues,
            'details': details
        }
    
    except Exception as e:
        return {
            'risk_score': 5,
            'issues': [f"URL parsing error: {str(e)}"],
            'details': {'error': str(e)}
        }