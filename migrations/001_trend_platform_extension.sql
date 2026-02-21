-- =====================================================
-- 트렌드 인텔리전스 플랫폼 DB 확장 마이그레이션
-- 실행 대상: Supabase SQL Editor
-- 날짜: 2026-02-18
-- =====================================================

-- =====================================================
-- 1. categories 테이블 (카테고리 마스터)
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  platform      TEXT NOT NULL DEFAULT 'oliveyoung',
  category_code TEXT NOT NULL,
  name_ko       TEXT NOT NULL,
  name_en       TEXT,
  name_vi       TEXT,
  parent_code   TEXT,
  depth         INT NOT NULL DEFAULT 0,
  sort_order    INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(platform, category_code)
);

COMMENT ON TABLE categories IS '플랫폼별 카테고리 마스터 테이블';
COMMENT ON COLUMN categories.platform IS '출처 플랫폼 (oliveyoung, musinsa, coupang 등)';
COMMENT ON COLUMN categories.category_code IS '플랫폼 고유 카테고리 코드';
COMMENT ON COLUMN categories.name_ko IS '카테고리 한국어명';
COMMENT ON COLUMN categories.name_en IS '카테고리 영어명';
COMMENT ON COLUMN categories.name_vi IS '카테고리 베트남어명';
COMMENT ON COLUMN categories.parent_code IS '상위 카테고리 코드';
COMMENT ON COLUMN categories.depth IS '카테고리 뎁스 (0=최상위)';

-- =====================================================
-- 2. profiles 테이블 확장 (구독/비즈니스 필드)
-- =====================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'vi',
  ADD COLUMN IF NOT EXISTS preferred_categories JSONB DEFAULT '[]';

COMMENT ON COLUMN profiles.subscription_tier IS '구독 등급: free, pro, enterprise';
COMMENT ON COLUMN profiles.subscription_expires_at IS '구독 만료일';
COMMENT ON COLUMN profiles.preferred_language IS '선호 언어: ko, en, vi';
COMMENT ON COLUMN profiles.preferred_categories IS '선호 카테고리 코드 배열';

-- =====================================================
-- 3. saved_products 테이블 (사용자 관심 상품)
-- =====================================================
CREATE TABLE IF NOT EXISTS saved_products (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id  BIGINT NOT NULL REFERENCES products_master(id) ON DELETE CASCADE,
  memo        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

COMMENT ON TABLE saved_products IS '사용자 관심 상품 북마크';
COMMENT ON COLUMN saved_products.memo IS '사용자가 남긴 메모';

-- =====================================================
-- 4. trend_reports 테이블 (트렌드 리포트)
-- =====================================================
CREATE TABLE IF NOT EXISTS trend_reports (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  report_type   TEXT NOT NULL DEFAULT 'weekly',
  title         TEXT NOT NULL,
  description   TEXT,
  report_date   DATE NOT NULL,
  file_url      TEXT,
  metadata_json JSONB DEFAULT '{}',
  is_public     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE trend_reports IS '주간/월간 트렌드 분석 리포트';
COMMENT ON COLUMN trend_reports.report_type IS '리포트 유형: weekly, monthly, custom';
COMMENT ON COLUMN trend_reports.file_url IS '생성된 PDF 파일 URL';
COMMENT ON COLUMN trend_reports.is_public IS 'true이면 모든 사용자 열람 가능';

-- =====================================================
-- 5. 성능 최적화 인덱스
-- =====================================================

-- rank_snapshots 시계열 분석용
CREATE INDEX IF NOT EXISTS idx_rank_snapshots_product_date
  ON rank_snapshots(product_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_rank_snapshots_date_source
  ON rank_snapshots(snapshot_date, source);

-- deals_snapshots 할인 분석용
CREATE INDEX IF NOT EXISTS idx_deals_snapshots_product_date
  ON deals_snapshots(product_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_deals_snapshots_date
  ON deals_snapshots(snapshot_date DESC);

-- daily_rankings_v2 분석용
CREATE INDEX IF NOT EXISTS idx_daily_rankings_v2_date_cat
  ON daily_rankings_v2(date, category_code);

CREATE INDEX IF NOT EXISTS idx_daily_rankings_v2_product
  ON daily_rankings_v2(product_id, date DESC);

-- saved_products 조회용
CREATE INDEX IF NOT EXISTS idx_saved_products_user
  ON saved_products(user_id);

-- products_master source별 조회
CREATE INDEX IF NOT EXISTS idx_products_master_source
  ON products_master(source);

-- =====================================================
-- 6. 트렌드 분석 뷰
-- =====================================================

-- 6-1. 7일 급상승 상품
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
  t.category AS category_code
FROM today t
JOIN week_ago w ON t.product_id = w.product_id
JOIN products_master pm ON t.product_id = pm.id
WHERE w.previous_rank > t.current_rank
  AND t.product_id != w.product_id IS FALSE
ORDER BY rank_change DESC;

-- 6-2. 오늘 최대 할인 상품
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
  END AS calculated_discount_pct
FROM deals_snapshots ds
JOIN products_master pm ON ds.product_id = pm.id
WHERE ds.snapshot_date = CURRENT_DATE
ORDER BY calculated_discount_pct DESC NULLS LAST;

-- 6-3. 리뷰 성장 상품
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
  pm.updated_at
FROM products_master pm
WHERE pm.tags->>'review_count' IS NOT NULL
  AND (pm.tags->>'review_count')::INT > 100
ORDER BY (pm.tags->>'review_count')::INT DESC;

-- =====================================================
-- 7. RLS (Row Level Security) 정책
-- =====================================================

-- saved_products: 본인 데이터만 접근
ALTER TABLE saved_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved products"
  ON saved_products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved products"
  ON saved_products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved products"
  ON saved_products FOR DELETE
  USING (auth.uid() = user_id);

-- trend_reports: 본인 리포트 또는 공개 리포트
ALTER TABLE trend_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or public reports"
  ON trend_reports FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

-- categories: 모든 인증 사용자 읽기 가능
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view categories"
  ON categories FOR SELECT
  USING (auth.role() = 'authenticated');

-- =====================================================
-- 8. 올리브영 카테고리 시드 데이터
-- =====================================================
INSERT INTO categories (platform, category_code, name_ko, name_en, name_vi, depth, sort_order) VALUES
  ('oliveyoung', '100000100010000', '전체', 'All Categories', 'Tất cả', 0, 0),
  ('oliveyoung', '10000010001', '스킨케어', 'Skincare', 'Chăm sóc da', 1, 1),
  ('oliveyoung', '10000010002', '마스크팩', 'Mask Pack', 'Mặt nạ', 1, 2),
  ('oliveyoung', '10000010003', '클렌징', 'Cleansing', 'Tẩy trang', 1, 3),
  ('oliveyoung', '10000010004', '선케어', 'Sun Care', 'Chống nắng', 1, 4),
  ('oliveyoung', '10000010005', '메이크업', 'Makeup', 'Trang điểm', 1, 5),
  ('oliveyoung', '10000010006', '립메이크업', 'Lip Makeup', 'Son môi', 1, 6),
  ('oliveyoung', '10000010007', '남성화장품', 'Men Cosmetics', 'Mỹ phẩm nam', 1, 7),
  ('oliveyoung', '10000010008', '더모코스메틱', 'Dermocosmetics', 'Dược mỹ phẩm', 1, 8),
  ('oliveyoung', '10000010009', '헤어케어', 'Hair Care', 'Chăm sóc tóc', 1, 9),
  ('oliveyoung', '10000010010', '바디케어', 'Body Care', 'Chăm sóc cơ thể', 1, 10),
  ('oliveyoung', '10000010011', '향수/디퓨저', 'Perfume/Diffuser', 'Nước hoa', 1, 11),
  ('oliveyoung', '10000010012', '미용소품', 'Beauty Tools', 'Dụng cụ làm đẹp', 1, 12),
  ('oliveyoung', '10000010013', '건강식품', 'Health Food', 'Thực phẩm sức khỏe', 1, 13)
ON CONFLICT (platform, category_code) DO NOTHING;

-- =====================================================
-- 완료
-- =====================================================
