-- =====================================================
-- 013_fix_musinsa_data_final.sql
-- 1. 무신사 상품 카테고리 정보 수동 보정 (이름 기반)
-- 2. 무신사 상품 태그(gender) 기본값 설정 (필터 작동 보장)
-- =====================================================

-- 1. 이름 기반 카테고리 매칭 (예시)
UPDATE products_master
SET category = '상의'
WHERE source = 'musinsa' AND (category IS NULL OR category = '')
  AND (name ILIKE '%티셔츠%' OR name ILIKE '%셔츠%' OR name ILIKE '%후드%' OR name ILIKE '%맨투맨%');

UPDATE products_master
SET category = '아우터'
WHERE source = 'musinsa' AND (category IS NULL OR category = '')
  AND (name ILIKE '%자켓%' OR name ILIKE '%점퍼%' OR name ILIKE '%코트%' OR name ILIKE '%블루종%' OR name ILIKE '%패딩%');

UPDATE products_master
SET category = '바지'
WHERE source = 'musinsa' AND (category IS NULL OR category = '')
  AND (name ILIKE '%팬츠%' OR name ILIKE '%슬랙스%' OR name ILIKE '%청바지%' OR name ILIKE '%데님%');

-- 2. 블루종 구체적 매칭 (사용자 스크린샷 대응)
UPDATE products_master
SET category = '블루종/MA-1'
WHERE source = 'musinsa' 
  AND (name ILIKE '%블루종%' OR name ILIKE '%MA-1%' OR name ILIKE '%MA1%');

-- 3. 태그 정보(gender)가 null인 경우 기본값 {"gender": "all"} 삽입
-- 이렇게 해야 'All' 필터링시에도 문제가 없고, 'Men'/'Women' 선택시에도 (비록 데이터는 안나올지언정) 쿼리 오류는 안남
UPDATE products_master
SET tags = '{"gender": "all"}'::jsonb
WHERE source = 'musinsa' AND (tags IS NULL OR tags = '{}'::jsonb);

-- 4. 만약 이름에 '여성', '우먼', 'Wmns' 등이 포함된 경우 gender를 female로 보정
UPDATE products_master
SET tags = jsonb_set(tags, '{gender}', '"female"')
WHERE source = 'musinsa' AND (name ILIKE '%여성%' OR name ILIKE '%우먼%' OR name ILIKE '%Wmns%');

UPDATE products_master
SET tags = jsonb_set(tags, '{gender}', '"male"')
WHERE source = 'musinsa' AND (name ILIKE '%남성%' OR name ILIKE '%맨%') AND NOT name ILIKE '%여성%';
