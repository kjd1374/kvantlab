-- Naver Best 재설계 v2 - DB 스키마 추가
-- Supabase Dashboard SQL Editor에서 실행하세요

-- 1. trend_brands 테이블 컬럼 추가
ALTER TABLE public.trend_brands ADD COLUMN IF NOT EXISTS period_type   TEXT    DEFAULT 'WEEKLY';
ALTER TABLE public.trend_brands ADD COLUMN IF NOT EXISTS category_id   TEXT    DEFAULT 'A';
ALTER TABLE public.trend_brands ADD COLUMN IF NOT EXISTS logo_url      TEXT;
ALTER TABLE public.trend_brands ADD COLUMN IF NOT EXISTS store_url     TEXT;
ALTER TABLE public.trend_brands ADD COLUMN IF NOT EXISTS hashtags      TEXT[];

-- 2. products_master 컬럼 추가 (Naver 공식 카테고리 ID)
ALTER TABLE public.products_master ADD COLUMN IF NOT EXISTS naver_category_id TEXT;

-- 3. trend_brands에 (category_id, period_type, rank) 인덱스 추가 (조회 성능)
CREATE INDEX IF NOT EXISTS idx_trend_brands_cat_period
    ON public.trend_brands (category_id, period_type, rank);

-- 4. products_master에 naver_category_id 인덱스
CREATE INDEX IF NOT EXISTS idx_products_naver_category
    ON public.products_master (naver_category_id)
    WHERE source = 'naver_best';
