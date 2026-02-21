-- =====================================================
-- Phase 7: 상품명 다국어 지원 (Product Name Localization)
-- 실행 대상: Supabase SQL Editor
-- =====================================================

-- 1. products_master 테이블에 다국어 이름 및 브랜드 컬럼 추가
ALTER TABLE products_master
  ADD COLUMN IF NOT EXISTS name_ko TEXT,
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS name_vi TEXT,
  ADD COLUMN IF NOT EXISTS name_th TEXT,
  ADD COLUMN IF NOT EXISTS name_id TEXT,
  ADD COLUMN IF NOT EXISTS name_ja TEXT,
  ADD COLUMN IF NOT EXISTS brand_ko TEXT,
  ADD COLUMN IF NOT EXISTS brand_en TEXT;

-- 2. 기존 데이터를 원문 컬럼으로 복사 (최초 1회)
UPDATE products_master 
SET name_ko = name 
WHERE name_ko IS NULL;

UPDATE products_master 
SET brand_ko = brand 
WHERE brand_ko IS NULL;

-- 3. 설명 주석 추가
COMMENT ON COLUMN products_master.name_ko IS '상품 한국어 이름 (원문)';
COMMENT ON COLUMN products_master.name_en IS '상품 영어 이름';
COMMENT ON COLUMN products_master.name_vi IS '상품 베트남어 이름';
COMMENT ON COLUMN products_master.name_th IS '상품 태국어 이름';
COMMENT ON COLUMN products_master.name_id IS '상품 인도네시아어 이름';
COMMENT ON COLUMN products_master.name_ja IS '상품 일본어 이름';
