-- 006_add_category_languages.sql
-- categories 테이블에 추가 언어 필드(태국어, 인도네시아어, 일본어)를 추가합니다.

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS name_th TEXT,
  ADD COLUMN IF NOT EXISTS name_id TEXT,
  ADD COLUMN IF NOT EXISTS name_ja TEXT;

COMMENT ON COLUMN categories.name_th IS '카테고리 태국어명';
COMMENT ON COLUMN categories.name_id IS '카테고리 인도네시아어명';
COMMENT ON COLUMN categories.name_ja IS '카테고리 일본어명';

-- 기존 데이터 업데이트 (예시 - 실제값은 수동 또는 크롤러에서 채워짐)
-- 여기서는 일단 영어 이름을 기본값으로 넣어둡니다.
UPDATE categories SET name_th = name_en WHERE name_th IS NULL;
UPDATE categories SET name_id = name_en WHERE name_id IS NULL;
UPDATE categories SET name_ja = name_en WHERE name_ja IS NULL;
