#!/bin/bash
# run_ssg_crawler.sh - 신세계 단독 크롤러 (12시간마다 = 하루 2회 실행)

LOG_FILE="/Users/jungdookim/NAS/datapool-test/dashboard/cron_ecommerce.log"
VENV_PYTHON="/Users/jungdookim/NAS/datapool-test/dashboard/venv/bin/python3"
CRAWLER_DIR="/Users/jungdookim/NAS/datapool-test/dashboard/generic_crawler"
export PYTHONPATH=$PYTHONPATH:/Users/jungdookim/NAS/datapool-test/dashboard

echo "========================================================" >> $LOG_FILE
echo "🏬 [$(date)] [SSG] Crawler Starting..." >> $LOG_FILE
$VENV_PYTHON -u $CRAWLER_DIR/ssg_crawler.py >> $LOG_FILE 2>&1
echo "✅ [$(date)] [SSG] Crawler Finished." >> $LOG_FILE
echo "========================================================" >> $LOG_FILE
