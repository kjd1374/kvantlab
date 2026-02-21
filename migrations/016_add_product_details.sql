-- =====================================================
-- 016_add_product_details.sql
-- products_master에 상품 상세 정보 컬럼 추가
-- (사이즈, 용량, 무게 등)
-- 실행 대상: Supabase SQL Editor
-- =====================================================

-- 1. 상품 상세 정보 컬럼 추가
ALTER TABLE products_master
  -- 용량/사이즈/무게 (뷰티: ml/g, 패션: S/M/L/XL 등)
  ADD COLUMN IF NOT EXISTS capacity TEXT,       -- 예: "50ml", "200g", "1L"
  ADD COLUMN IF NOT EXISTS weight_g INTEGER,    -- 무게 (그램 단위, 정수) 예: 150
  ADD COLUMN IF NOT EXISTS sizes TEXT[],        -- 사이즈 배열, 예: ["S","M","L","XL"] 또는 ["55ml","100ml"]
  -- 상품 상세 설명
  ADD COLUMN IF NOT EXISTS description TEXT,   -- 상품 상세 설명 원문
  ADD COLUMN IF NOT EXISTS ingredients TEXT,   -- 성분 정보 (뷰티용)
  ADD COLUMN IF NOT EXISTS skin_type TEXT[],   -- 피부 타입 (예: ["건성","민감성"])
  -- 기타 메타
  ADD COLUMN IF NOT EXISTS detail_fetched_at TIMESTAMPTZ; -- 상세 정보 마지막 수집 시각

-- 2. 코멘트
COMMENT ON COLUMN products_master.capacity          IS '상품 용량/사이즈 원문 (예: 50ml, 200g)';
COMMENT ON COLUMN products_master.weight_g          IS '상품 무게 (그램 단위)';
COMMENT ON COLUMN products_master.sizes             IS '판매 사이즈 배열 (패션: S/M/L, 뷰티: 용량 단위 등)';
COMMENT ON COLUMN products_master.description       IS '상품 상세 설명 원문';
COMMENT ON COLUMN products_master.ingredients       IS '성분 정보 (뷰티 카테고리)';
COMMENT ON COLUMN products_master.skin_type         IS '피부 타입 정보 배열';
COMMENT ON COLUMN products_master.detail_fetched_at IS '상세 정보 마지막 크롤링 시각';

-- 3. source CHECK 제약 조건을 열린 구조로 교체
--    새 사이트 추가 시마다 마이그레이션 없이 자유롭게 source 추가 가능
ALTER TABLE products_master
  DROP CONSTRAINT IF EXISTS products_master_source_check;

ALTER TABLE daily_rankings_v2
  DROP CONSTRAINT IF EXISTS daily_rankings_v2_source_check;

-- source는 NOT NULL만 유지, CHECK 제약 제거 → 크롤러 추가 시 DB 수정 불필요
COMMENT ON COLUMN products_master.source IS '수집 출처 플랫폼 (oliveyoung, musinsa, coupang, 향후 추가 가능)';
COMMENT ON COLUMN daily_rankings_v2.source IS '랭킹 출처 플랫폼';
