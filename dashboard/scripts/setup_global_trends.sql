-- 새 테이블 생성: global_shopping_trends
-- AI 기반 트렌드 수집 봇이 유튜브와 구글 검색 결과에서 추출한 '실제 쇼핑 선호도' 데이터를 저장합니다.

CREATE TABLE IF NOT EXISTS public.global_shopping_trends (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code varchar(10) NOT NULL, -- 국가 코드 (예: VN, TH, US)
  main_category varchar(100) NOT NULL, -- 대분류 (예: Skincare, Makeup)
  product_name varchar(255) NOT NULL, -- 상품명 (한글/영문 혼용 또는 정규화 버전)
  brand_name varchar(255), -- 브랜드명 
  mention_count int DEFAULT 1, -- 미디어 포스트/영상에서 언급된 총 횟수
  key_benefits jsonb DEFAULT '[]'::jsonb, -- 주요 기대 효능 ["미백", "보습", "진정"]
  data_sources jsonb DEFAULT '[]'::jsonb, -- 출처 (유튜브 링크 등)
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE(country_code, product_name) -- 동일 국가 내 특정 제품은 하나로 통계 집계
);

-- RLS 활성화 (보안)
ALTER TABLE public.global_shopping_trends ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 가능하도록 권한 부여 (필요 시 수정)
CREATE POLICY "Enable read access for all users" ON public.global_shopping_trends FOR SELECT USING (true);
