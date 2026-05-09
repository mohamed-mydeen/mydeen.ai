# ssl_checker.py
"""
SSL Certificate and HTTPS Analysis Module
Validates SSL certificates and checks for secure connections
"""

import ssl
import socket
from urllib.parse import urlparse
from datetime import datetime
import requests

def analyze_ssl(url):
    """
    Analyzes SSL certificate and HTTPS configuration
    
    Returns:
        dict: {
            'risk_score': int (0-20),
            'issues': list of detected issues,
            'details': dict of SSL information
        }
    """
    risk_score = 0
    issues = []
    details = {}
    
    try:
        parsed = urlparse(url)
        
        # 1. Check if URL uses HTTPS
        if parsed.scheme == 'http':
            risk_score += 15
            issues.append("Website does not use HTTPS (insecure connection)")
            details['uses_https'] = False
            return {
                'risk_score': risk_score,
                'issues': issues,
                'details': details
            }
        elif parsed.scheme == 'https':
            details['uses_https'] = True
        else:
            risk_score += 10
            issues.append(f"Unknown protocol: {parsed.scheme}")
            return {
                'risk_score': risk_score,
                'issues': issues,
                'details': details
            }
        
        # 2. Extract hostname
        hostname = parsed.netloc
        if ':' in hostname:
            hostname = hostname.split(':')[0]
        
        # 3. Check SSL certificate validity
        try:
            context = ssl.create_default_context()
            
            with socket.create_connection((hostname, 443), timeout=5) as sock:
                with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                    cert = ssock.getpeercert()
                    
                    # Get certificate details
                    if cert:
                        # Check certificate expiration
                        not_after = cert.get('notAfter')
                        if not_after:
                            expiry_date = datetime.strptime(not_after, '%b %d %H:%M:%S %Y %Z')
                            details['cert_expiry'] = expiry_date.strftime('%Y-%m-%d')
                            
                            days_until_expiry = (expiry_date - datetime.now()).days
                            details['days_until_cert_expiry'] = days_until_expiry
                            
                            if days_until_expiry < 0:
                                risk_score += 20
                                issues.append("SSL certificate has expired!")
                            elif days_until_expiry < 30:
                                risk_score += 10
                                issues.append(f"SSL certificate expires soon ({days_until_expiry} days)")
                        
                        # Check certificate issuer
                        issuer = dict(x[0] for x in cert.get('issuer', []))
                        if issuer:
                            details['cert_issuer'] = issuer.get('organizationName', 'Unknown')
                            
                            # Check for self-signed or unknown issuers (basic check)
                            subject = dict(x[0] for x in cert.get('subject', []))
                            if issuer == subject:
                                risk_score += 12
                                issues.append("Self-signed SSL certificate detected")
                        
                        # Check subject alternative names (should match domain)
                        san = cert.get('subjectAltName', [])
                        details['cert_domains'] = [x[1] for x in san if x[0] == 'DNS']
                        
                        # Verify hostname matches certificate
                        hostname_match = any(hostname == domain or hostname.endswith('.' + domain.lstrip('*.')) 
                                            for domain in details['cert_domains'])
                        
                        if not hostname_match and details['cert_domains']:
                            risk_score += 15
                            issues.append("Hostname does not match SSL certificate")
                    
                    # Check SSL version
                    ssl_version = ssock.version()
                    details['ssl_version'] = ssl_version
                    
                    # Warn about older SSL/TLS versions
                    if ssl_version in ['SSLv2', 'SSLv3', 'TLSv1', 'TLSv1.1']:
                        risk_score += 8
                        issues.append(f"Outdated SSL/TLS version: {ssl_version}")
        
        except ssl.SSLCertVerificationError as ssl_err:
            risk_score += 18
            issues.append(f"SSL certificate verification failed: {str(ssl_err)}")
            details['ssl_error'] = 'verification_failed'
        
        except ssl.SSLError as ssl_err:
            risk_score += 15
            issues.append(f"SSL connection error: {str(ssl_err)}")
            details['ssl_error'] = 'connection_error'
        
        except socket.timeout:
            risk_score += 5
            issues.append("Connection timeout (server unreachable)")
            details['ssl_error'] = 'timeout'
        
        except Exception as e:
            risk_score += 10
            issues.append(f"Could not verify SSL: {str(e)}")
            details['ssl_error'] = str(e)
        
        # 4. Try to make a request to check redirects
        try:
            response = requests.get(url, timeout=5, allow_redirects=True)
            
            # Check number of redirects
            redirect_count = len(response.history)
            details['redirect_count'] = redirect_count
            
            if redirect_count > 3:
                risk_score += 8
                issues.append(f"Multiple redirects detected ({redirect_count})")
            elif redirect_count > 1:
                risk_score += 4
                issues.append(f"Website redirects {redirect_count} times")
            
            # Check if final URL is different from input URL
            if response.url != url:
                details['final_url'] = response.url
                final_parsed = urlparse(response.url)
                
                # Check if domain changed during redirect
                if final_parsed.netloc != parsed.netloc:
                    risk_score += 10
                    issues.append(f"Redirects to different domain: {final_parsed.netloc}")
        
        except requests.exceptions.SSLError:
            risk_score += 12
            issues.append("SSL error during connection")
        
        except requests.exceptions.Timeout:
            risk_score += 3
            issues.append("Request timeout")
        
        except requests.exceptions.RequestException as req_err:
            risk_score += 5
            issues.append(f"Connection issue: {str(req_err)}")
        
        # Cap the risk score at 20 (max for SSL analysis)
        risk_score = min(risk_score, 20)
        
        return {
            'risk_score': risk_score,
            'issues': issues,
            'details': details
        }
    
    except Exception as e:
        return {
            'risk_score': 5,
            'issues': [f"SSL analysis error: {str(e)}"],
            'details': {'error': str(e)}
        }