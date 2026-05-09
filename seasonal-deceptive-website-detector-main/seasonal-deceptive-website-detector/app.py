# app.py
"""
Seasonal Fake Offer & Phishing Website Detection System
Streamlit Frontend Interface
"""

import streamlit as st
from risk_engine import calculate_risk
import time

# Page configuration
st.set_page_config(
    page_title="Seasonal Scam Detector",
    page_icon="🛡️",
    layout="wide"
)

# Custom CSS for better styling
st.markdown("""
    <style>
    .main-header {
        font-size: 2.5rem;
        font-weight: bold;
        text-align: center;
        color: #1E88E5;
        margin-bottom: 1rem;
    }
    .sub-header {
        text-align: center;
        color: #666;
        margin-bottom: 2rem;
    }
    .safe-box {
        padding: 20px;
        border-radius: 10px;
        background-color: #d4edda;
        border-left: 5px solid #28a745;
        margin: 10px 0;
    }
    .caution-box {
        padding: 20px;
        border-radius: 10px;
        background-color: #fff3cd;
        border-left: 5px solid #ffc107;
        margin: 10px 0;
    }
    .suspicious-box {
        padding: 20px;
        border-radius: 10px;
        background-color: #ffe0b2;
        border-left: 5px solid #ff9800;
        margin: 10px 0;
    }
    .danger-box {
        padding: 20px;
        border-radius: 10px;
        background-color: #f8d7da;
        border-left: 5px solid #dc3545;
        margin: 10px 0;
    }
    .metric-card {
        padding: 15px;
        border-radius: 8px;
        background-color: #f8f9fa;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    </style>
""", unsafe_allow_html=True)

# Header
st.markdown('<div class="main-header">🛡️ Seasonal Fake Offer & Phishing Detector</div>', unsafe_allow_html=True)
st.markdown('<div class="sub-header">Protect yourself from seasonal scams targeting Indian users</div>', unsafe_allow_html=True)

# Info section
with st.expander("ℹ️ About This Tool"):
    st.markdown("""
    This cybersecurity tool analyzes websites for deceptive patterns commonly used in seasonal scams,
    especially those targeting Indian users during festivals and celebrations.
    
    **Detection Features:**
    -  URL pattern analysis
    -  Domain age verification (WHOIS)
    -  SSL certificate validation
    -  Scam keyword detection (Tamil & English)
    -  Psychological manipulation detection
    -  Seasonal event correlation
    
    **Note:** This tool provides risk assessment only. Always verify websites through official channels.
    """)

# Main input section
st.markdown("---")
col1, col2 = st.columns([3, 1])

with col1:
    url_input = st.text_input(
        "🔗 Enter Website URL to Analyze",
        placeholder="https://example.com",
        help="Enter the complete URL including http:// or https://"
    )

with col2:
    st.markdown("<br>", unsafe_allow_html=True)
    analyze_button = st.button("🔍 Analyze Website", type="primary", use_container_width=True)

# Example URLs for testing
st.markdown("**Quick Test URLs:**")
example_cols = st.columns(4)
with example_cols[0]:
    if st.button("Test: Google (Safe)"):
        url_input = "https://www.google.com"
        analyze_button = True
with example_cols[1]:
    if st.button("Test: Suspicious URL"):
        url_input = "http://free-prize-winner-2024.tk/claim"
        analyze_button = True
with example_cols[2]:
    if st.button("Test: Bit.ly (Shortener)"):
        url_input = "https://bit.ly/example"
        analyze_button = True
with example_cols[3]:
    if st.button("Test: Long URL"):
        url_input = "http://claim-your-free-iphone-prize-winner-congratulations-2024.xyz"
        analyze_button = True

# Analysis section
if analyze_button and url_input:
    # Validate URL format
    if not url_input.startswith(('http://', 'https://')):
        st.error("⚠️ Please enter a valid URL starting with http:// or https://")
    else:
        # Progress bar
        progress_text = st.empty()
        progress_bar = st.progress(0)
        
        progress_text.text("🔍 Analyzing URL patterns...")
        progress_bar.progress(20)
        time.sleep(0.3)
        
        progress_text.text("📅 Checking domain age and registration...")
        progress_bar.progress(40)
        time.sleep(0.3)
        
        progress_text.text("🔒 Validating SSL certificate...")
        progress_bar.progress(60)
        time.sleep(0.3)
        
        progress_text.text("📝 Analyzing webpage content...")
        progress_bar.progress(80)
        
        # Run analysis
        try:
            results = calculate_risk(url_input)
            
            progress_bar.progress(100)
            progress_text.text("✅ Analysis Complete!")
            time.sleep(0.5)
            
            # Clear progress indicators
            progress_text.empty()
            progress_bar.empty()
            
            # Display results
            st.markdown("---")
            st.markdown("## 📊 Analysis Results")
            
            # Risk score display with color-coded box
            risk_score = results['total_risk_score']
            risk_category = results['risk_category']
            
            if risk_score >= 70:
                box_class = "danger-box"
            elif risk_score >= 45:
                box_class = "suspicious-box"
            elif risk_score >= 25:
                box_class = "caution-box"
            else:
                box_class = "safe-box"
            
            st.markdown(f"""
                <div class="{box_class}">
                    <h2 style="margin: 0;">{risk_category}</h2>
                    <h1 style="margin: 10px 0;">Risk Score: {risk_score}/100</h1>
                    <p style="margin: 0;"><strong>Confidence:</strong> {results['confidence']}</p>
                </div>
            """, unsafe_allow_html=True)
            
            # Module scores
            st.markdown("### 📈 Detailed Risk Breakdown")
            
            score_cols = st.columns(4)
            modules = [
                ("URL Analysis", results['module_scores'].get('url_analysis', 0), 30),
                ("Domain Check", results['module_scores'].get('domain_analysis', 0), 25),
                ("SSL Security", results['module_scores'].get('ssl_analysis', 0), 20),
                ("Content Scan", results['module_scores'].get('content_analysis', 0), 25)
            ]
            
            for col, (module_name, score, max_score) in zip(score_cols, modules):
                with col:
                    percentage = (score / max_score) * 100
                    st.metric(
                        label=module_name,
                        value=f"{score}/{max_score}",
                        delta=f"{percentage:.0f}%"
                    )
            
            # Issues detected
            if results['all_issues']:
                st.markdown("### ⚠️ Issues Detected")
                
                # Categorize issues
                critical_issues = []
                warning_issues = []
                info_issues = []
                
                for issue in results['all_issues']:
                    if any(word in issue.lower() for word in ['expired', 'self-signed', 'fake', 'deceptive', 'very new']):
                        critical_issues.append(issue)
                    elif any(word in issue.lower() for word in ['suspicious', 'does not exist', 'not found', 'multiple']):
                        warning_issues.append(issue)
                    else:
                        info_issues.append(issue)
                
                # Display critical issues
                if critical_issues:
                    st.markdown("**🚨 Critical Issues:**")
                    for i, issue in enumerate(critical_issues, 1):
                        st.markdown(f"{i}. {issue}")
                
                # Display warnings
                if warning_issues:
                    st.markdown("**⚠️ Warnings:**")
                    for i, issue in enumerate(warning_issues, len(critical_issues) + 1):
                        st.markdown(f"{i}. {issue}")
                
                # Display info
                if info_issues:
                    st.markdown("**ℹ️ Information:**")
                    for i, issue in enumerate(info_issues, len(critical_issues) + len(warning_issues) + 1):
                        st.markdown(f"{i}. {issue}")
                
                # Special note if domain doesn't exist
                if any('does not exist' in issue.lower() or 'not found' in issue.lower() for issue in results['all_issues']):
                    st.info("ℹ️ **Note:** The domain could not be reached. This often indicates a fake or inactive website. Our system analyzed the URL pattern and structure instead.")
            
            # Detailed findings
            with st.expander("🔍 Detailed Technical Findings"):
                for module_name, details in results['module_details'].items():
                    st.markdown(f"**{module_name.replace('_', ' ').title()}:**")
                    for key, value in details.items():
                        if isinstance(value, list):
                            st.markdown(f"- {key}: {', '.join(map(str, value[:5]))}")
                        else:
                            st.markdown(f"- {key}: {value}")
                    st.markdown("---")
            
            # Recommendations
            st.markdown("### 💡 Recommendations")
            
            for recommendation in results['recommendations']:
                st.markdown(f"- {recommendation}")
            
            # Warning banner for high-risk sites
            if risk_score >= 70:
                st.error("""
                    🚨 **CRITICAL WARNING:** This website exhibits multiple characteristics of a deceptive/phishing site.
                    Do NOT share personal information, passwords, or make any payments on this website.
                """)
            
        except Exception as e:
            st.error(f"❌ Error during analysis: {str(e)}")
            st.info("This could be due to network issues or the website being unreachable.")

elif analyze_button:
    st.warning("⚠️ Please enter a URL to analyze")

# Footer
st.markdown("---")
st.markdown("""
    <div style="text-align: center; color: #666; padding: 20px;">
        <p><strong>🛡️ Seasonal Scam Detector</strong></p>
        <p>Developed for cybersecurity awareness | Protects Indian users from festival-time scams</p>
        <p style="font-size: 0.8rem;">⚠️ This tool provides risk assessment only. Always verify websites independently.</p>
        <p style="font-size: 0.8rem;"> Developed by mohamed mydeen </p>
    </div>
    

""", unsafe_allow_html=True)
