-- =====================================================
-- 011_fix_view_isolation.sql
-- 뷰에 source 컬럼 추가하여 플랫폼별 데이터 격리 지원
-- =====================================================

-- 1. 7일 급상승 상품 뷰 업데이트 (pm.source 추가)
CREATE OR REPLACE VIEW v_trending_7d AS
WITH ranked AS (
  SELECT
    rs.product_id,
    rs.rank,
    rs.snapshot_date,
    rs.category,
    ROW_NUMBER() OVER (PARTITION BY rs.product_id ORDER BY rs.snapshot_date DESC) AS rn_recent,
    ROW_NUMBER() OVER (PARTITION BY rs.product_id ORDER BY rs.snapshot_date ASC)  AS rn_oldest
  FROM rank_snapshots rs
  WHERE rs.snapshot_date >= CURRENT_DATE - INTERVAL '7 days'
),
today AS (
  SELECT product_id, rank AS current_rank, category
  FROM ranked WHERE rn_recent = 1
),
week_ago AS (
  SELECT product_id, rank AS previous_rank
  FROM ranked WHERE rn_oldest = 1
)
SELECT
  t.product_id,
  pm.name,
  pm.brand,
  pm.image_url,
  pm.url,
  pm.price,
  t.current_rank,
  w.previous_rank,
  (w.previous_rank - t.current_rank) AS rank_change,
  t.category AS category_code,
  pm.source  -- 플랫폼 식별을 위해 추가
FROM today t
JOIN week_ago w ON t.product_id = w.product_id
JOIN products_master pm ON t.product_id = pm.id
WHERE w.previous_rank > t.current_rank
ORDER BY rank_change DESC;

-- 2. 오늘 최대 할인 상품 뷰 업데이트 (pm.source 추가)
CREATE OR REPLACE VIEW v_top_deals_today AS
SELECT
  ds.product_id,
  pm.name,
  pm.brand,
  pm.image_url,
  pm.url,
  ds.original_price,
  ds.deal_price,
  ds.discount_rate,
  CASE
    WHEN ds.original_price > 0 AND ds.deal_price > 0
    THEN ROUND(((ds.original_price - ds.deal_price) / ds.original_price) * 100, 1)
    ELSE ds.discount_rate
  END AS calculated_discount_pct,
  pm.source  -- 플랫폼 식별을 위해 추가
FROM deals_snapshots ds
JOIN products_master pm ON ds.product_id = pm.id
WHERE ds.snapshot_date = CURRENT_DATE
ORDER BY calculated_discount_pct DESC NULLS LAST;

-- 3. 리뷰 성장 상품 뷰 업데이트 (pm.source 추가)
CREATE OR REPLACE VIEW v_review_growth AS
SELECT
  pm.id AS product_id,
  pm.name,
  pm.brand,
  pm.image_url,
  pm.url,
  (pm.tags->>'review_count')::INT AS review_count,
  (pm.tags->>'review_rating')::NUMERIC AS review_rating,
  pm.price,
  pm.updated_at,
  pm.source  -- 플랫폼 식별을 위해 추가
FROM products_master pm
WHERE pm.tags->>'review_count' IS NOT NULL
  AND (pm.tags->>'review_count')::INT > 100
ORDER BY (pm.tags->>'review_count')::INT DESC;
