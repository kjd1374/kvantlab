#!/bin/bash
# run_oliveyoung_crawler.sh - 올리브영 단독 크롤러 (3시간마다 실행)

LOG_FILE="/Users/jungdookim/NAS/datapool-test/dashboard/cron_ecommerce.log"
VENV_PYTHON="/Users/jungdookim/NAS/datapool-test/dashboard/venv/bin/python3"
CRAWLER_DIR="/Users/jungdookim/NAS/datapool-test/dashboard/generic_crawler"
export PYTHONPATH=$PYTHONPATH:/Users/jungdookim/NAS/datapool-test/dashboard

echo "========================================================" >> $LOG_FILE
echo "🛍️ [$(date)] [OliveYoung] Crawler Starting..." >> $LOG_FILE
$VENV_PYTHON -u $CRAWLER_DIR/oliveyoung_crawler.py >> $LOG_FILE 2>&1
echo "🔥 [$(date)] [OliveYoung Hotdeal] Crawler Starting..." >> $LOG_FILE
$VENV_PYTHON -u $CRAWLER_DIR/oliveyoung_hotdeal_crawler.py >> $LOG_FILE 2>&1
echo "✅ [$(date)] [OliveYoung] Crawler Finished." >> $LOG_FILE
echo "========================================================" >> $LOG_FILE
