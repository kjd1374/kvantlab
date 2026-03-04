#!/bin/bash
# run_ecommerce_crawlers.sh - Sequential runner for all 4 e-commerce platforms

LOG_FILE="/Users/jungdookim/NAS/datapool-test/dashboard/cron_ecommerce.log"
export PYTHONPATH=$PYTHONPATH:/Users/jungdookim/NAS/datapool-test/dashboard
VENV_PYTHON="/Users/jungdookim/NAS/datapool-test/dashboard/venv/bin/python3"
CRAWLER_DIR="/Users/jungdookim/NAS/datapool-test/dashboard/generic_crawler"

echo "========================================================" >> $LOG_FILE
echo "🏁 [$(date)] Starting Daily E-commerce Crawling Pipeline..." >> $LOG_FILE
echo "========================================================" >> $LOG_FILE

# 1. OliveYoung Crawler
echo "➡️ [$(date)] Starting OliveYoung Crawler..." >> $LOG_FILE
$VENV_PYTHON -u $CRAWLER_DIR/oliveyoung_crawler.py >> $LOG_FILE 2>&1
echo "✅ [$(date)] OliveYoung Crawler Finished." >> $LOG_FILE

# 2. Musinsa Crawler
echo "➡️ [$(date)] Starting Musinsa Crawler..." >> $LOG_FILE
$VENV_PYTHON -u $CRAWLER_DIR/musinsa_crawler.py >> $LOG_FILE 2>&1
echo "✅ [$(date)] Musinsa Crawler Finished." >> $LOG_FILE

# 3. Ably Crawler
echo "➡️ [$(date)] Starting Ably Crawler..." >> $LOG_FILE
$VENV_PYTHON -u $CRAWLER_DIR/ably_crawler.py >> $LOG_FILE 2>&1
echo "✅ [$(date)] Ably Crawler Finished." >> $LOG_FILE

# 4. SSG Crawler
echo "➡️ [$(date)] Starting SSG Crawler..." >> $LOG_FILE
$VENV_PYTHON -u $CRAWLER_DIR/ssg_crawler.py >> $LOG_FILE 2>&1
echo "✅ [$(date)] SSG Crawler Finished." >> $LOG_FILE

echo "========================================================" >> $LOG_FILE
echo "🎉 [$(date)] Daily E-commerce Crawling Pipeline Completed!" >> $LOG_FILE
echo "========================================================" >> $LOG_FILE
