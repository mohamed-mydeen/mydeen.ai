# domain_checker.py
"""
Domain Age and WHOIS Analysis Module
Checks domain registration age and correlates with seasonal events
"""

import whois
from datetime import datetime, timedelta
from urllib.parse import urlparse

def analyze_domain(url):
    """
    Analyzes domain age and registration details
    
    Returns:
        dict: {
            'risk_score': int (0-25),
            'issues': list of detected issues,
            'details': dict of domain information
        }
    """
    risk_score = 0
    issues = []
    details = {}
    
    try:
        # Extract domain from URL
        parsed = urlparse(url)
        domain = parsed.netloc
        
        # Remove 'www.' prefix if present
        if domain.startswith('www.'):
            domain = domain[4:]
        
        details['domain'] = domain
        
        # Perform WHOIS lookup
        try:
            domain_info = whois.whois(domain)
            
            # Get creation date
            creation_date = domain_info.creation_date
            
            # Handle cases where creation_date is a list
            if isinstance(creation_date, list):
                creation_date = creation_date[0]
            
            if creation_date:
                details['creation_date'] = creation_date.strftime('%Y-%m-%d')
                
                # Calculate domain age
                domain_age_days = (datetime.now() - creation_date).days
                details['domain_age_days'] = domain_age_days
                
                # Risk scoring based on domain age
                if domain_age_days < 30:
                    risk_score += 20
                    issues.append(f"Very new domain (only {domain_age_days} days old)")
                elif domain_age_days < 90:
                    risk_score += 15
                    issues.append(f"Recent domain ({domain_age_days} days old)")
                elif domain_age_days < 180:
                    risk_score += 10
                    issues.append(f"Domain less than 6 months old ({domain_age_days} days)")
                elif domain_age_days < 365:
                    risk_score += 5
                    issues.append(f"Domain less than 1 year old ({domain_age_days} days)")
                else:
                    details['domain_age_status'] = 'established'
                
                # Seasonal event correlation
                # Check if domain was created near major Indian festivals/events
                seasonal_risk = check_seasonal_timing(creation_date)
                if seasonal_risk['is_suspicious']:
                    risk_score += seasonal_risk['risk_points']
                    issues.append(seasonal_risk['message'])
                    details['seasonal_correlation'] = seasonal_risk['event']
            
            # Check expiration date
            expiration_date = domain_info.expiration_date
            if isinstance(expiration_date, list):
                expiration_date = expiration_date[0]
            
            if expiration_date:
                details['expiration_date'] = expiration_date.strftime('%Y-%m-%d')
                days_until_expiry = (expiration_date - datetime.now()).days
                details['days_until_expiry'] = days_until_expiry
                
                # Short registration periods are suspicious
                if creation_date and days_until_expiry < 365:
                    risk_score += 5
                    issues.append(f"Short registration period (expires in {days_until_expiry} days)")
            
            # Registrar information
            if domain_info.registrar:
                details['registrar'] = domain_info.registrar
            
        except Exception as whois_error:
            # WHOIS lookup failed - slightly suspicious
            risk_score += 8
            issues.append("Could not retrieve domain registration information")
            details['whois_error'] = str(whois_error)
        
        # Cap the risk score at 25 (max for domain analysis)
        risk_score = min(risk_score, 25)
        
        return {
            'risk_score': risk_score,
            'issues': issues,
            'details': details
        }
    
    except Exception as e:
        return {
            'risk_score': 5,
            'issues': [f"Domain analysis error: {str(e)}"],
            'details': {'error': str(e)}
        }


def check_seasonal_timing(creation_date):
    """
    Checks if domain was created suspiciously close to seasonal events
    
    Args:
        creation_date: datetime object of domain creation
    
    Returns:
        dict: Seasonal correlation analysis
    """
    current_year = datetime.now().year
    
    # Define major seasonal events in India (approximate dates)
    seasonal_events = {
        'Diwali': [(10, 15), (11, 15)],  # Mid-October to Mid-November
        'New Year': [(12, 15), (1, 15)],  # Mid-December to Mid-January
        'Holi': [(2, 15), (3, 31)],       # Mid-February to End of March
        'Raksha Bandhan': [(7, 15), (8, 31)],  # Mid-July to End of August
        'Christmas': [(12, 1), (12, 31)],
        'Black Friday': [(11, 20), (11, 30)],
        'Republic Day': [(1, 15), (1, 31)],
        'Independence Day': [(8, 1), (8, 20)]
    }
    
    creation_month = creation_date.month
    creation_day = creation_date.day
    
    for event, date_ranges in seasonal_events.items():
        for start, end in date_ranges:
            start_month, start_day = start
            end_month, end_day = end
            
            # Check if creation date falls within event window
            if start_month <= creation_month <= end_month:
                if (creation_month == start_month and creation_day >= start_day) or \
                   (creation_month == end_month and creation_day <= end_day) or \
                   (start_month < creation_month < end_month):
                    
                    # Domain created within 30 days of event
                    days_before = (datetime.now() - creation_date).days
                    
                    if days_before < 60:  # Very recent creation near festival
                        return {
                            'is_suspicious': True,
                            'risk_points': 10,
                            'message': f"Domain created near {event} (seasonal scam timing)",
                            'event': event
                        }
    
    return {
        'is_suspicious': False,
        'risk_points': 0,
        'message': '',
        'event': None
    }