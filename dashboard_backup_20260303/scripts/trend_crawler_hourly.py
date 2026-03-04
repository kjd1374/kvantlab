"""
trend_crawler_hourly.py
──────────────────────────────────────────────────────────────
구글 트렌드 + 네이버 데이터랩 크롤러를 1시간마다 자동 실행합니다.
크롤러 완료 후 Gemini 후처리(브랜드/성분/패션 태깅)도 자동 실행합니다.
백그라운드 실행: python scripts/trend_crawler_hourly.py

종료:  Ctrl+C
"""
import subprocess
import time
import sys
import os
from datetime import datetime

# 루트 디렉토리 (scripts 폴더의 상위)
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

INTERVAL_SECONDS = 60 * 60  # 1시간

# ① 크롤러 (데이터 수집)
CRAWLERS = [
    ("구글 트렌드 (쇼핑 특화)", "generic_crawler/google_trends_crawler.py"),
    ("네이버 데이터랩",          "generic_crawler/naver_datalab_crawler.py"),
]

# ② Gemini 후처리 (태그 추출)
ENRICHER = ("Gemini 트렌드 태깅 (브랜드/성분/패션)", "scripts/trend_enricher.py")

def run_script(label, script_path):
    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] ▶ {label} 시작...")
    result = subprocess.run(
        [sys.executable, script_path],
        cwd=ROOT,
        capture_output=False,
    )
    if result.returncode == 0:
        print(f"  ✅ {label} 완료")
    else:
        print(f"  ❌ {label} 실패 (exit code {result.returncode})")

def main():
    print("=" * 60)
    print("  Korea Trends 1시간 주기 스케줄러 시작")
    print("  [크롤러 → Gemini 태깅] 자동 파이프라인")
    print(f"  실행 주기: {INTERVAL_SECONDS // 60}분")
    print("  종료: Ctrl+C")
    print("=" * 60)

    run_count = 0
    while True:
        run_count += 1
        print(f"\n\n{'=' * 50}")
        print(f"  [사이클 #{run_count}] {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'=' * 50}")

        # 단계 1: 크롤러 실행
        print("\n📡 [단계 1/2] 트렌드 데이터 수집")
        for label, path in CRAWLERS:
            try:
                run_script(label, path)
            except Exception as e:
                print(f"  ❌ {label} 예외 발생: {e}")

        # 단계 2: Gemini 후처리 (크롤러 완료 후 바로 실행)
        print("\n🤖 [단계 2/2] Gemini AI 트렌드 태깅")
        try:
            run_script(*ENRICHER)
        except Exception as e:
            print(f"  ❌ Gemini 태깅 예외 발생: {e}")

        next_run = datetime.fromtimestamp(time.time() + INTERVAL_SECONDS)
        print(f"\n  💤 다음 실행: {next_run.strftime('%H:%M:%S')} (1시간 후)")
        time.sleep(INTERVAL_SECONDS)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n  ⏹ 스케줄러 종료.\n")

