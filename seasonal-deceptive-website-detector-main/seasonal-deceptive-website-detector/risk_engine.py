# risk_engine.py
"""
Risk Scoring and Classification Engine
Aggregates all detection modules and provides final risk assessment
"""

from url_checker import analyze_url
from domain_checker import analyze_domain
from ssl_checker import analyze_ssl
from content_checker import analyze_content

def calculate_risk(url):
    """
    Master function that runs all detection modules and calculates final risk
    
    Returns:
        dict: {
            'total_risk_score': int (0-100),
            'risk_category': str (Safe/Suspicious/Deceptive),
            'confidence': str,
            'all_issues': list,
            'module_scores': dict,
            'recommendations': list
        }
    """
    
    # Initialize results
    results = {
        'url': url,
        'total_risk_score': 0,
        'risk_category': 'Unknown',
        'confidence': 'Low',
        'all_issues': [],
        'module_scores': {},
        'module_details': {},
        'recommendations': []
    }
    
    # Run all detection modules
    print(f"\n🔍 Analyzing: {url}\n")
    
    # Module 1: URL Pattern Analysis
    print("▶ Running URL pattern analysis...")
    url_result = analyze_url(url)
    results['module_scores']['url_analysis'] = url_result['risk_score']
    results['module_details']['url_analysis'] = url_result['details']
    results['all_issues'].extend(url_result['issues'])
    
    # Module 2: Domain Age & WHOIS
    print("▶ Running domain age check...")
    domain_result = analyze_domain(url)
    results['module_scores']['domain_analysis'] = domain_result['risk_score']
    results['module_details']['domain_analysis'] = domain_result['details']
    results['all_issues'].extend(domain_result['issues'])
    
    # Module 3: SSL Certificate
    print("▶ Running SSL certificate validation...")
    ssl_result = analyze_ssl(url)
    results['module_scores']['ssl_analysis'] = ssl_result['risk_score']
    results['module_details']['ssl_analysis'] = ssl_result['details']
    results['all_issues'].extend(ssl_result['issues'])
    
    # Module 4: Content Analysis
    print("▶ Running webpage content analysis...")
    content_result = analyze_content(url)
    results['module_scores']['content_analysis'] = content_result['risk_score']
    results['module_details']['content_analysis'] = content_result['details']
    results['all_issues'].extend(content_result['issues'])
    
    # Calculate total risk score
    total_score = sum(results['module_scores'].values())
    results['total_risk_score'] = min(total_score, 100)  # Cap at 100
    
    # Classify risk category
    risk_classification = classify_risk(results['total_risk_score'], results['module_scores'])
    results['risk_category'] = risk_classification['category']
    results['confidence'] = risk_classification['confidence']
    results['severity_color'] = risk_classification['color']
    
    # Generate recommendations
    results['recommendations'] = generate_recommendations(
        results['total_risk_score'], 
        results['all_issues']
    )
    
    print(f"\n✅ Analysis Complete!")
    print(f"Total Risk Score: {results['total_risk_score']}/100")
    print(f"Category: {results['risk_category']}\n")
    
    return results


def classify_risk(total_score, module_scores):
    """
    Classifies website into risk categories with confidence levels
    
    Args:
        total_score: Total risk score (0-100)
        module_scores: Individual module scores
    
    Returns:
        dict: Classification results
    """
    
    # Count how many modules flagged high risk
    high_risk_modules = sum(1 for score in module_scores.values() if score > 15)
    
    # Determine category based on score
    if total_score >= 70:
        category = "🚨 DECEPTIVE"
        confidence = "High"
        color = "red"
    elif total_score >= 45:
        category = "⚠️ SUSPICIOUS"
        confidence = "Medium" if high_risk_modules >= 2 else "Low-Medium"
        color = "orange"
    elif total_score >= 25:
        category = "⚡ CAUTION"
        confidence = "Low"
        color = "yellow"
    else:
        category = "✅ SAFE"
        confidence = "High" if total_score < 10 else "Medium"
        color = "green"
    
    return {
        'category': category,
        'confidence': confidence,
        'color': color
    }


def generate_recommendations(risk_score, issues):
    """
    Generates actionable recommendations based on detected issues
    
    Args:
        risk_score: Total risk score
        issues: List of detected issues
    
    Returns:
        list: Recommendations for user
    """
    recommendations = []
    
    if risk_score >= 70:
        recommendations.append("🛑 DO NOT enter any personal information on this website")
        recommendations.append("🛑 DO NOT make any payments or share financial details")
        recommendations.append("🛑 DO NOT click on links or download files")
        recommendations.append("⚠️ Report this website to cybercrime authorities")
        recommendations.append("⚠️ Warn others who may have received this link")
    
    elif risk_score >= 45:
        recommendations.append("⚠️ Exercise extreme caution with this website")
        recommendations.append("⚠️ Verify the legitimacy through official channels")
        recommendations.append("⚠️ Do not share sensitive information")
        recommendations.append("💡 Check reviews and user experiences online")
    
    elif risk_score >= 25:
        recommendations.append("💡 Be cautious when interacting with this website")
        recommendations.append("💡 Verify website authenticity before proceeding")
        recommendations.append("💡 Look for trust indicators (contact info, reviews)")
    
    else:
        recommendations.append("✅ Website appears relatively safe")
        recommendations.append("💡 Still exercise general online safety practices")
        recommendations.append("💡 Verify legitimacy before sharing personal data")
    
    # Add specific recommendations based on issues
    issue_text = ' '.join(issues).lower()
    
    if 'ssl' in issue_text or 'https' in issue_text:
        recommendations.append("🔒 Issue detected: Insecure connection - avoid entering sensitive data")
    
    if 'domain' in issue_text and ('new' in issue_text or 'recent' in issue_text):
        recommendations.append("📅 Issue detected: Very new domain - verify legitimacy carefully")
    
    if 'whatsapp' in issue_text or 'share' in issue_text:
        recommendations.append("📱 Issue detected: Viral sharing tactics - likely seasonal scam")
    
    if 'tamil' in issue_text or 'psychological' in issue_text:
        recommendations.append("🧠 Issue detected: Psychological manipulation tactics detected")
    
    return recommendations