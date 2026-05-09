# verify_setup.py
"""
Setup Verification Script
Run this to ensure all files are correctly set up
"""

import os
import sys

def check_file(filename):
    """Check if a file exists"""
    if os.path.exists(filename):
        print(f"✅ {filename} - Found")
        return True
    else:
        print(f"❌ {filename} - Missing!")
        return False

def check_imports():
    """Check if all required modules can be imported"""
    modules_to_check = [
        ('streamlit', 'streamlit'),
        ('requests', 'requests'),
        ('whois', 'python-whois'),
        ('bs4', 'beautifulsoup4'),
        ('urllib3', 'urllib3')
    ]
    
    all_good = True
    for module_name, package_name in modules_to_check:
        try:
            __import__(module_name)
            print(f"✅ {package_name} - Installed")
        except ImportError:
            print(f"❌ {package_name} - Not installed!")
            print(f"   Install with: pip install {package_name}")
            all_good = False
    
    return all_good

def main():
    print("=" * 60)
    print("🔍 Seasonal Fake Offer Detection - Setup Verification")
    print("=" * 60)
    print()
    
    # Check files
    print("📁 Checking Project Files:")
    print("-" * 60)
    required_files = [
        'app.py',
        'keywords.py',
        'url_checker.py',
        'domain_checker.py',
        'ssl_checker.py',
        'content_checker.py',
        'risk_engine.py',
        'requirements.txt'
    ]
    
    files_ok = all(check_file(f) for f in required_files)
    print()
    
    # Check dependencies
    print("📦 Checking Dependencies:")
    print("-" * 60)
    deps_ok = check_imports()
    print()
    
    # Final verdict
    print("=" * 60)
    if files_ok and deps_ok:
        print("✅ SETUP COMPLETE! All files and dependencies are ready.")
        print()
        print("🚀 To run the application:")
        print("   streamlit run app.py")
    else:
        print("⚠️ SETUP INCOMPLETE! Please fix the issues above.")
        if not deps_ok:
            print()
            print("📦 To install all dependencies at once:")
            print("   pip install -r requirements.txt")
    print("=" * 60)

if __name__ == "__main__":
    main()