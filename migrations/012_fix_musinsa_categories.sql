-- =====================================================
-- 012_fix_musinsa_categories.sql
-- 1. rank_snapshots에서 최신 랭킹 데이터를 daily_rankings_v2로 복구
-- 2. products_master의 category 컬럼 채우기 (데이터 격리 및 필터링 지원)
-- =====================================================

-- 1. daily_rankings_v2 데이터 복구 (비어있는 경우에만)
INSERT INTO daily_rankings_v2 (source, date, category_code, rank, product_id)
SELECT 
    source, 
    snapshot_date, 
    category, 
    rank, 
    product_id
FROM rank_snapshots
ON CONFLICT DO NOTHING;

-- 2. products_master의 category 컬럼을 한글 레이블로 업데이트 (올리브영 & 무신사 공통)
WITH latest_ranks AS (
    SELECT DISTINCT ON (product_id)
        product_id,
        category_code,
        source
    FROM daily_rankings_v2
    ORDER BY product_id, date DESC
),
cat_mapping AS (
    SELECT 
        c.category_code,
        c.name_ko,
        c.platform
    FROM categories c
)
UPDATE products_master pm
SET category = cm.name_ko
FROM latest_ranks lr
JOIN cat_mapping cm ON lr.category_code = cm.category_code AND lr.source = cm.platform
WHERE pm.id = lr.product_id
  AND (pm.category IS NULL OR pm.category = '');

-- 3. (추가) category_id가 null인 경우 category_code를 통해 보정 (향후 크롤러 안정성용)
-- 이 부분은 이미 뷰(011_fix_view_isolation.sql)에서 처리중일 수 있으나 기반 데이터 보정 차원임
