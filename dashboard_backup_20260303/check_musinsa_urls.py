
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import time

def check_urls():
    urls = [
        "https://www.musinsa.com/ranking/best",
        "https://www.musinsa.com/ranking",
        "https://www.musinsa.com/main/ranking",
        "https://www.musinsa.com/categories/item/001"
    ]

    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)

    for url in urls:
        try:
            print(f"Checking {url}...")
            driver.get(url)
            time.sleep(3)
            title = driver.title
            print(f"Title: {title}")
            if "페이지를 찾을 수 없습니다" not in title and "랭킹" in title or "무신사" in title:
                 # Check page source length as a proxy for content
                 src_len = len(driver.page_source)
                 print(f"Content Length: {src_len}")
        except Exception as e:
            print(f"Error checking {url}: {e}")

    driver.quit()

if __name__ == "__main__":
    check_urls()
