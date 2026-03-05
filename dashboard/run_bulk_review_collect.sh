#!/bin/bash
# run_bulk_review_collect.sh - 전체 플랫폼 리뷰 대량 수집 (일회성)
# 올리브영(현재 실행 중) 완료 대기 → 무신사/에이블리/SSG 각 3000개씩 수집
# 완료 후 crontab 복원 필요: crontab /tmp/crontab_backup_20260306.txt

LOG_FILE="/Users/jungdookim/NAS/datapool-test/dashboard/cron_bulk_review.log"
VENV_PYTHON="/Users/jungdookim/NAS/datapool-test/dashboard/venv/bin/python3"
COLLECTOR="/Users/jungdookim/NAS/datapool-test/dashboard/generic_crawler/review_collector.py"
export PYTHONPATH=$PYTHONPATH:/Users/jungdookim/NAS/datapool-test/dashboard

echo "========================================================" >> $LOG_FILE
echo "🚀 [$(date)] Bulk Review Collection 시작" >> $LOG_FILE
echo "========================================================" >> $LOG_FILE

# 현재 실행 중인 review_collector 프로세스 완료 대기
echo "⏳ [$(date)] 현재 실행 중인 review_collector 완료 대기..." >> $LOG_FILE
while pgrep -f "review_collector.py.*oliveyoung" > /dev/null 2>&1; do
    sleep 30
done
echo "✅ [$(date)] 기존 프로세스 완료, 대량 수집 시작" >> $LOG_FILE

# 1. 무신사 (3000개, 리뷰 없음: ~10,039)
echo "📦 [$(date)] [MUSINSA] 리뷰 수집 시작 (3000개)" >> $LOG_FILE
$VENV_PYTHON -u $COLLECTOR --platform musinsa --limit 3000 >> $LOG_FILE 2>&1
echo "✅ [$(date)] [MUSINSA] 리뷰 수집 완료" >> $LOG_FILE

# 2. 에이블리 (3000개, 리뷰 없음: ~2,257)
echo "📦 [$(date)] [ABLY] 리뷰 수집 시작 (3000개)" >> $LOG_FILE
$VENV_PYTHON -u $COLLECTOR --platform ably --limit 3000 >> $LOG_FILE 2>&1
echo "✅ [$(date)] [ABLY] 리뷰 수집 완료" >> $LOG_FILE

# 3. SSG (3000개, 리뷰 없음: ~188)
echo "📦 [$(date)] [SSG] 리뷰 수집 시작 (3000개)" >> $LOG_FILE
$VENV_PYTHON -u $COLLECTOR --platform ssg --limit 3000 >> $LOG_FILE 2>&1
echo "✅ [$(date)] [SSG] 리뷰 수집 완료" >> $LOG_FILE

echo "========================================================" >> $LOG_FILE
echo "🎉 [$(date)] Bulk Review Collection 전체 완료!" >> $LOG_FILE
echo "⚠️  crontab 복원 필요: crontab /tmp/crontab_backup_20260306.txt" >> $LOG_FILE
echo "========================================================" >> $LOG_FILE
