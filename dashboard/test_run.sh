#!/bin/bash
# test_run.sh - Run a single crawler for verification

cd /Users/jungdookim/NAS/datapool-test/dashboard || exit
source venv/bin/activate
export PYTHONPATH=$PYTHONPATH:.

echo "🚀 Starting Google Trends Crawler Test..."
python3 generic_crawler/google_trends_crawler.py

echo "🚀 Starting Naver DataLab Crawler Test..."
python3 generic_crawler/naver_datalab_crawler.py

echo "✅ Test Run Completed."
