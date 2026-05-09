# # content_checker.py
# """
# Webpage Content Analysis Module
# Scrapes and analyzes webpage content for scam keywords and psychological triggers
# """

# import requests
# from bs4 import BeautifulSoup
# from keywords import (TAMIL_SCAM_KEYWORDS, ENGLISH_SCAM_KEYWORDS, 
#                      PSYCHOLOGICAL_TRIGGERS)

# def analyze_content(url):
#     """
#     Analyzes webpage content for deceptive patterns
    
#     Returns:
#         dict: {
#             'risk_score': int (0-25),
#             'issues': list of detected issues,
#             'details': dict of content analysis
#         }
#     """
#     risk_score = 0
#     issues = []
#     details = {}
    
#     try:
#         # Fetch webpage content
#         headers = {
#             'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
#         }
        
#         response = requests.get(url, timeout=10, headers=headers, allow_redirects=True)
#         response.raise_for_status()
        
#         # Parse HTML content
#         soup = BeautifulSoup(response.content, 'html.parser')
        
#         # Extract text content
#         text_content = soup.get_text().lower()
#         details['content_length'] = len(text_content)
        
#         # Get page title
#         title = soup.find('title')
#         if title:
#             details['page_title'] = title.get_text()
        
#         # 1. Check for Tamil scam keywords
#         tamil_keywords_found = []
#         for keyword in TAMIL_SCAM_KEYWORDS:
#             if keyword in soup.get_text():
#                 tamil_keywords_found.append(keyword)
        
#         if tamil_keywords_found:
#             risk_score += len(tamil_keywords_found) * 2
#             issues.append(f"Tamil scam keywords detected: {len(tamil_keywords_found)} instances")
#             details['tamil_keywords'] = tamil_keywords_found[:5]  # Show first 5
        
#         # 2. Check for English scam keywords
#         english_keywords_found = []
#         for keyword in ENGLISH_SCAM_KEYWORDS:
#             if keyword in text_content:
#                 english_keywords_found.append(keyword)
        
#         if english_keywords_found:
#             risk_score += len(english_keywords_found) * 1.5
#             issues.append(f"English scam keywords detected: {len(english_keywords_found)} instances")
#             details['english_keywords'] = english_keywords_found[:5]  # Show first 5
        
#         # 3. Check for psychological trigger phrases
#         triggers_found = []
#         for trigger in PSYCHOLOGICAL_TRIGGERS:
#             if trigger in text_content:
#                 triggers_found.append(trigger)
        
#         if triggers_found:
#             risk_score += len(triggers_found) * 2
#             issues.append(f"Psychological manipulation detected: {len(triggers_found)} trigger phrases")
#             details['psychological_triggers'] = triggers_found[:5]  # Show first 5
        
#         # 4. Check for forms (could be phishing for credentials)
#         forms = soup.find_all('form')
#         details['form_count'] = len(forms)
        
#         if forms:
#             # Check for password or sensitive input fields
#             sensitive_fields = []
#             for form in forms:
#                 inputs = form.find_all('input')
#                 for inp in inputs:
#                     input_type = inp.get('type', '').lower()
#                     input_name = inp.get('name', '').lower()
                    
#                     if input_type in ['password', 'email', 'tel', 'number']:
#                         sensitive_fields.append(input_type)
#                     elif any(word in input_name for word in ['password', 'credit', 'card', 'cvv', 'otp', 'pin']):
#                         sensitive_fields.append(input_name)
            
#             if sensitive_fields:
#                 risk_score += 8
#                 issues.append(f"Form requesting sensitive information: {', '.join(set(sensitive_fields))}")
#                 details['sensitive_fields'] = list(set(sensitive_fields))
        
#         # 5. Check for excessive external links (could redirect to malicious sites)
#         links = soup.find_all('a', href=True)
#         external_links = [link['href'] for link in links if link['href'].startswith('http')]
#         details['external_link_count'] = len(external_links)
        
#         if len(external_links) > 50:
#             risk_score += 6
#             issues.append(f"Excessive external links ({len(external_links)})")
        
#         # 6. Check for WhatsApp share buttons (common in viral scams)
#         whatsapp_mentions = text_content.count('whatsapp') + text_content.count('வாட்ஸ்அப்')
#         if whatsapp_mentions > 2:
#             risk_score += 5
#             issues.append(f"Multiple WhatsApp sharing prompts ({whatsapp_mentions} mentions)")
#             details['whatsapp_mentions'] = whatsapp_mentions
        
#         # 7. Check for suspicious JavaScript
#         scripts = soup.find_all('script')
#         suspicious_js_patterns = ['eval(', 'document.write', 'unescape', 'fromCharCode']
        
#         suspicious_scripts = 0
#         for script in scripts:
#             script_content = script.string if script.string else ''
#             if any(pattern in script_content for pattern in suspicious_js_patterns):
#                 suspicious_scripts += 1
        
#         if suspicious_scripts > 0:
#             risk_score += suspicious_scripts * 3
#             issues.append(f"Suspicious JavaScript code detected ({suspicious_scripts} instances)")
#             details['suspicious_scripts'] = suspicious_scripts
        
#         # 8. Check for fake countdown timers (creates urgency)
#         if 'countdown' in text_content or 'timer' in text_content or 'expire' in text_content:
#             risk_score += 4
#             issues.append("Countdown timer detected (artificial urgency tactic)")
        
#         # 9. Check for social proof manipulation
#         social_proof_terms = ['people claimed', 'users won', 'recently won', 'just claimed']
#         social_proof_count = sum(1 for term in social_proof_terms if term in text_content)
        
#         if social_proof_count > 0:
#             risk_score += social_proof_count * 3
#             issues.append("Fake social proof indicators detected")
#             details['social_proof_indicators'] = social_proof_count
        
#         # 10. Check content quality (very short content may be placeholder/scam)
#         if details['content_length'] < 200 and forms:
#             risk_score += 7
#             issues.append("Minimal content with forms (likely phishing)")
        
#         # Cap the risk score at 25 (max for content analysis)
#         risk_score = min(risk_score, 25)
        
#         return {
#             'risk_score': risk_score,
#             'issues': issues,
#             'details': details
#         }
    
#     except requests.exceptions.Timeout:
#         return {
#             'risk_score': 3,
#             'issues': ["Could not load webpage (timeout)"],
#             'details': {'error': 'timeout'}
#         }
    
#     except requests.exceptions.RequestException as e:
#         return {
#             'risk_score': 5,
#             'issues': [f"Could not fetch webpage: {str(e)}"],
#             'details': {'error': str(e)}
#         }
    
#     except Exception as e:
#         return {
#             'risk_score': 3,
#             'issues': [f"Content analysis error: {str(e)}"],
#             'details': {'error': str(e)}
#         }
# content_checker.py
"""
Webpage Content Analysis Module
Scrapes and analyzes webpage content for scam keywords and psychological triggers
"""

import requests
from bs4 import BeautifulSoup
from keywords import (TAMIL_SCAM_KEYWORDS, ENGLISH_SCAM_KEYWORDS, 
                     PSYCHOLOGICAL_TRIGGERS)

def analyze_content(url):
    """
    Analyzes webpage content for deceptive patterns
    
    Returns:
        dict: {
            'risk_score': int (0-25),
            'issues': list of detected issues,
            'details': dict of content analysis
        }
    """
    risk_score = 0
    issues = []
    details = {}
    
    try:
        # Fetch webpage content
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(url, timeout=10, headers=headers, allow_redirects=True)
        response.raise_for_status()
        
        # Parse HTML content
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Extract text content
        text_content = soup.get_text().lower()
        details['content_length'] = len(text_content)
        
        # Get page title
        title = soup.find('title')
        if title:
            details['page_title'] = title.get_text()
        
        # 1. Check for Tamil scam keywords
        tamil_keywords_found = []
        for keyword in TAMIL_SCAM_KEYWORDS:
            if keyword in soup.get_text():
                tamil_keywords_found.append(keyword)
        
        if tamil_keywords_found:
            risk_score += len(tamil_keywords_found) * 2
            issues.append(f"Tamil scam keywords detected: {len(tamil_keywords_found)} instances")
            details['tamil_keywords'] = tamil_keywords_found[:5]  # Show first 5
        
        # 2. Check for English scam keywords
        english_keywords_found = []
        for keyword in ENGLISH_SCAM_KEYWORDS:
            if keyword in text_content:
                english_keywords_found.append(keyword)
        
        if english_keywords_found:
            risk_score += len(english_keywords_found) * 1.5
            issues.append(f"English scam keywords detected: {len(english_keywords_found)} instances")
            details['english_keywords'] = english_keywords_found[:5]  # Show first 5
        
        # 3. Check for psychological trigger phrases
        triggers_found = []
        for trigger in PSYCHOLOGICAL_TRIGGERS:
            if trigger in text_content:
                triggers_found.append(trigger)
        
        if triggers_found:
            risk_score += len(triggers_found) * 2
            issues.append(f"Psychological manipulation detected: {len(triggers_found)} trigger phrases")
            details['psychological_triggers'] = triggers_found[:5]  # Show first 5
        
        # 4. Check for forms (could be phishing for credentials)
        forms = soup.find_all('form')
        details['form_count'] = len(forms)
        
        if forms:
            # Check for password or sensitive input fields
            sensitive_fields = []
            for form in forms:
                inputs = form.find_all('input')
                for inp in inputs:
                    input_type = inp.get('type', '').lower()
                    input_name = inp.get('name', '').lower()
                    
                    if input_type in ['password', 'email', 'tel', 'number']:
                        sensitive_fields.append(input_type)
                    elif any(word in input_name for word in ['password', 'credit', 'card', 'cvv', 'otp', 'pin']):
                        sensitive_fields.append(input_name)
            
            if sensitive_fields:
                risk_score += 8
                issues.append(f"Form requesting sensitive information: {', '.join(set(sensitive_fields))}")
                details['sensitive_fields'] = list(set(sensitive_fields))
        
        # 5. Check for excessive external links (could redirect to malicious sites)
        links = soup.find_all('a', href=True)
        external_links = [link['href'] for link in links if link['href'].startswith('http')]
        details['external_link_count'] = len(external_links)
        
        if len(external_links) > 50:
            risk_score += 6
            issues.append(f"Excessive external links ({len(external_links)})")
        
        # 6. Check for WhatsApp share buttons (common in viral scams)
        whatsapp_mentions = text_content.count('whatsapp') + text_content.count('வாட்ஸ்அப்')
        if whatsapp_mentions > 2:
            risk_score += 5
            issues.append(f"Multiple WhatsApp sharing prompts ({whatsapp_mentions} mentions)")
            details['whatsapp_mentions'] = whatsapp_mentions
        
        # 7. Check for suspicious JavaScript
        scripts = soup.find_all('script')
        suspicious_js_patterns = ['eval(', 'document.write', 'unescape', 'fromCharCode']
        
        suspicious_scripts = 0
        for script in scripts:
            script_content = script.string if script.string else ''
            if any(pattern in script_content for pattern in suspicious_js_patterns):
                suspicious_scripts += 1
        
        if suspicious_scripts > 0:
            risk_score += suspicious_scripts * 3
            issues.append(f"Suspicious JavaScript code detected ({suspicious_scripts} instances)")
            details['suspicious_scripts'] = suspicious_scripts
        
        # 8. Check for fake countdown timers (creates urgency)
        if 'countdown' in text_content or 'timer' in text_content or 'expire' in text_content:
            risk_score += 4
            issues.append("Countdown timer detected (artificial urgency tactic)")
        
        # 9. Check for social proof manipulation
        social_proof_terms = ['people claimed', 'users won', 'recently won', 'just claimed']
        social_proof_count = sum(1 for term in social_proof_terms if term in text_content)
        
        if social_proof_count > 0:
            risk_score += social_proof_count * 3
            issues.append("Fake social proof indicators detected")
            details['social_proof_indicators'] = social_proof_count
        
        # 10. Check content quality (very short content may be placeholder/scam)
        if details['content_length'] < 200 and forms:
            risk_score += 7
            issues.append("Minimal content with forms (likely phishing)")
        
        # Cap the risk score at 25 (max for content analysis)
        risk_score = min(risk_score, 25)
        
        return {
            'risk_score': risk_score,
            'issues': issues,
            'details': details
        }
    
    except requests.exceptions.Timeout:
        return {
            'risk_score': 3,
            'issues': ["Website took too long to respond (timeout)"],
            'details': {'error': 'timeout', 'note': 'Could not analyze content'}
        }
    
    except requests.exceptions.ConnectionError as e:
        # Domain doesn't exist or can't be reached
        if 'Failed to resolve' in str(e) or 'Name or service not known' in str(e):
            return {
                'risk_score': 8,
                'issues': ["Domain does not exist or cannot be reached (suspicious)"],
                'details': {'error': 'domain_not_found', 'note': 'Website may be fake or taken down'}
            }
        else:
            return {
                'risk_score': 5,
                'issues': ["Could not connect to website"],
                'details': {'error': 'connection_failed'}
            }
    
    except requests.exceptions.RequestException as e:
        return {
            'risk_score': 5,
            'issues': ["Unable to analyze webpage content"],
            'details': {'error': 'request_failed', 'note': 'Other modules still analyzed the URL'}
        }
    
    except Exception as e:
        return {
            'risk_score': 3,
            'issues': ["Content analysis incomplete"],
            'details': {'error': str(e)}
        }