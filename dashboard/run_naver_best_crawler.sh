#!/bin/bash
# Naver Best Crawler Runner
# Runs every 3 hours via crontab

cd /Users/jungdookim/NAS/datapool-test/dashboard

echo "=========================================="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 네이버 베스트 크롤러 시작"
echo "=========================================="

/Users/jungdookim/NAS/datapool-test/dashboard/venv/bin/python3 -u \
    /Users/jungdookim/NAS/datapool-test/dashboard/generic_crawler/naver_best_crawler.py

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 네이버 베스트 크롤러 완료"
echo ""
