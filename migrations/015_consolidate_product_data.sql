-- =====================================================
-- 015_consolidate_product_data.sql
-- 1. 중복/분산된 상품 데이터를 products_master로 통합
-- 2. 고유 키 제약 조건 강화
-- 3. 불필요한 레거시 테이블 정리
-- =====================================================

-- 1. 전제 조건: workflow에 필요한 컬럼이 products_master에 있는지 확인 및 추가
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS vi_name TEXT;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS ai_summary JSONB;

-- 2. ranking_products_v2 데이터를 products_master로 병합
-- 테이블마다 스키마가 다를 수 있으므로, 가장 확실한 정보(ID, 이름, 브랜드, 가격 등) 위주로 병합
INSERT INTO products_master (source, product_id, name, brand, price, image_url, url, vi_name, tags, created_at, updated_at)
SELECT DISTINCT ON (dr.source, rp.product_id)
    dr.source, 
    rp.product_id, 
    rp.name, 
    rp.brand, 
    rp.price_current, 
    rp.image_url, 
    rp.product_url, 
    NULL, -- vi_name 은 추후 AI 워크플로우에서 생성 가능하므로 NULL 허용
    jsonb_build_object('category_code', dr.category_code),
    now(), 
    now()
FROM ranking_products_v2 rp
JOIN daily_rankings_v2 dr ON rp.product_id::text = dr.product_id::text
ON CONFLICT (source, product_id) DO UPDATE SET
    name = EXCLUDED.name,
    brand = EXCLUDED.brand,
    price = EXCLUDED.price,
    image_url = EXCLUDED.image_url,
    url = EXCLUDED.url,
    updated_at = now();

-- 2. category_code를 products_master의 tags에 통합 (조인 최적화용)
-- daily_rankings_v2 정보를 바탕으로 최신 카테고리 코드를 tags에 기록
UPDATE products_master pm
SET tags = jsonb_set(COALESCE(pm.tags, '{}'::jsonb), '{category_code}', to_jsonb(dr.category_code))
FROM (
    SELECT DISTINCT ON (source, product_id) source, product_id, category_code
    FROM daily_rankings_v2
    ORDER BY source, product_id, date DESC
) dr
WHERE pm.product_id::text = dr.product_id::text AND pm.source = dr.source;

-- 3. (주의) 데이터 검증이 완료된 후 레거시 테이블 삭제 권장
-- DROP TABLE IF EXISTS ranking_products_v2; 
-- DROP TABLE IF EXISTS daily_rankings; 

COMMENT ON TABLE products_master IS '통합된 상품 마스터 테이블 (모든 소스 포함)';
