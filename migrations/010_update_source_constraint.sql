-- =====================================================
-- 010_update_source_constraint.sql
-- products_master 및 daily_rankings_v2 테이블의 source 컬럼 및 제약 조건 업데이트
-- 실행 대상: Supabase SQL Editor
-- =====================================================

-- 1. products_master 제약 조건 및 유니크 키 업데이트
ALTER TABLE products_master 
DROP CONSTRAINT IF EXISTS products_master_source_check;

ALTER TABLE products_master 
ADD CONSTRAINT products_master_source_check 
CHECK (source IN ('oliveyoung', 'musinsa', 'coupang'));

-- Upsert를 위한 유니크 제약 조건 추가 (이미 있으면 무시)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_master_source_product_id_key') THEN
        ALTER TABLE products_master ADD CONSTRAINT products_master_source_product_id_key UNIQUE (source, product_id);
    END IF;
END $$;

-- 2. daily_rankings_v2 테이블 소스 컬럼 추가 및 타입 수정
DO $$ 
BEGIN 
    -- source 컬럼이 없으면 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='daily_rankings_v2' AND column_name='source') THEN
        ALTER TABLE daily_rankings_v2 ADD COLUMN source TEXT NOT NULL DEFAULT 'oliveyoung';
    END IF;
END $$;

-- 타입 불일치 해결을 위한 구조 변경
ALTER TABLE daily_rankings_v2 DROP CONSTRAINT IF EXISTS daily_rankings_v2_product_id_fkey;
ALTER TABLE daily_rankings_v2 DROP CONSTRAINT IF EXISTS daily_rankings_v2_product_id_date_category_key;

-- [중요] 기존 데이터 초기화 (TEXT ID -> BIGINT ID 전환을 위해 필수)
TRUNCATE TABLE daily_rankings_v2;

-- product_id 컬럼 타입을 BIGINT로 변경 (기존 TEXT 타입과의 호환성 문제 해결)
ALTER TABLE daily_rankings_v2 
ALTER COLUMN product_id TYPE BIGINT USING NULL; 

-- 제약 조건 재설정
ALTER TABLE daily_rankings_v2
DROP CONSTRAINT IF EXISTS daily_rankings_v2_source_check;

ALTER TABLE daily_rankings_v2
ADD CONSTRAINT daily_rankings_v2_source_check
CHECK (source IN ('oliveyoung', 'musinsa', 'coupang'));

-- Upsert를 위한 유니크 제약 조건 추가
ALTER TABLE daily_rankings_v2 
ADD CONSTRAINT daily_rankings_v2_product_id_date_category_key 
UNIQUE (product_id, date, category_code);

-- 3. 외래 키(Foreign Key) 관계 수정
-- daily_rankings_v2.product_id가 products_master.id(BIGINT)를 올바르게 참조하도록 설정
ALTER TABLE daily_rankings_v2
ADD CONSTRAINT daily_rankings_v2_product_id_fkey
FOREIGN KEY (product_id) REFERENCES products_master(id) ON DELETE CASCADE;

COMMENT ON CONSTRAINT products_master_source_check ON products_master IS '허용되는 플랫폼 출처 제한';
COMMENT ON CONSTRAINT daily_rankings_v2_source_check ON daily_rankings_v2 IS '허용되는 플랫폼 출처 제한';
COMMENT ON CONSTRAINT daily_rankings_v2_product_id_fkey ON daily_rankings_v2 IS '상품 마스터 테이블 참조';
COMMENT ON CONSTRAINT daily_rankings_v2_product_id_date_category_key ON daily_rankings_v2 IS '랭킹 중복 방지 제약 조건';
