#!/bin/bash
# run_ably_crawler.sh - 에이블리 단독 크롤러 (3시간마다 실행)

LOG_FILE="/Users/jungdookim/NAS/datapool-test/dashboard/cron_ecommerce.log"
VENV_PYTHON="/Users/jungdookim/NAS/datapool-test/dashboard/venv/bin/python3"
CRAWLER_DIR="/Users/jungdookim/NAS/datapool-test/dashboard/generic_crawler"
export PYTHONPATH=$PYTHONPATH:/Users/jungdookim/NAS/datapool-test/dashboard

echo "========================================================" >> $LOG_FILE
echo "👗 [$(date)] [Ably] Crawler Starting..." >> $LOG_FILE
$VENV_PYTHON -u $CRAWLER_DIR/ably_crawler.py >> $LOG_FILE 2>&1
echo "✅ [$(date)] [Ably] Crawler Finished." >> $LOG_FILE
echo "🤖 [$(date)] [Ably] AI Review Collector Starting..." >> $LOG_FILE
$VENV_PYTHON -u $CRAWLER_DIR/review_collector.py --platform ably >> $LOG_FILE 2>&1
echo "✅ [$(date)] [Ably] AI Review Collector Finished." >> $LOG_FILE
echo "========================================================" >> $LOG_FILE
