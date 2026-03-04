from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto('http://localhost:6001/index.html', wait_until='networkidle')
    
    # Click the CTA button to open the auth modal
    page.click('#startTrialBtn')
    page.wait_for_timeout(500)
    
    # Switch to Signup tab
    page.click('.auth-tab[data-mode="signup"]')
    page.wait_for_timeout(500)
    
    page.screenshot(path='/Users/jungdookim/.gemini/antigravity/brain/e3284333-b43c-4c31-bd45-092289999a9a/signup_modal_new.png', full_page=True)
    browser.close()
    print('Screenshot saved.')
