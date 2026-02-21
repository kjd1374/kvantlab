-- =====================================================
-- 014_trend_workflow_tables.sql
-- 트렌드 분석 워크플로우를 위한 스키마 확장
-- 1단계: 트렌드 추출, 2단계: 상품 매칭, 3단계: 홍보 문구 생성
-- =====================================================

-- 1. 워크플로우 실행 이력 테이블
CREATE TABLE IF NOT EXISTS trend_analysis_runs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    input_text TEXT NOT NULL, -- 입력받은 기사/SNS 원문
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE trend_analysis_runs IS '트렌드 분석 워크플로우 실행 세션 데이터';

-- 2. 1단계: 추출된 트렌드 데이터
CREATE TABLE IF NOT EXISTS extracted_trends (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    run_id BIGINT NOT NULL REFERENCES trend_analysis_runs(id) ON DELETE CASCADE,
    trend_keyword TEXT NOT NULL, -- 핵심 트렌드 키워드
    key_elements TEXT[], -- 주목해야 할 성분 또는 스타일
    reason TEXT, -- 트렌드 유행 이유
    target_audience TEXT, -- 타겟 연령층 및 성별
    slogan TEXT, -- 핵심 슬로건
    raw_json JSONB, -- AI 응답 원본
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extracted_trends_run_id ON extracted_trends(run_id);
COMMENT ON TABLE extracted_trends IS '1단계 AI 추출 트렌드 정보';

-- 3. 2단계: 트렌드-상품 매칭 결과
CREATE TABLE IF NOT EXISTS trend_product_matches (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    run_id BIGINT NOT NULL REFERENCES trend_analysis_runs(id) ON DELETE CASCADE,
    trend_id BIGINT NOT NULL REFERENCES extracted_trends(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products_master(id) ON DELETE CASCADE,
    match_score INT, -- 1-100 매칭 점수
    match_reason TEXT, -- 선정 사유
    rank_in_run INT, -- 해당 실행 내에서의 추천 순위 (1~5)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trend_product_matches_run_id ON trend_product_matches(run_id);
CREATE INDEX IF NOT EXISTS idx_trend_product_matches_trend_id ON trend_product_matches(trend_id);
COMMENT ON TABLE trend_product_matches IS '2단계 AI 선정 추천 상품 리스트';

-- 4. 3단계: 현지화 홍보 문구 데이터
CREATE TABLE IF NOT EXISTS marketing_contents (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    run_id BIGINT NOT NULL REFERENCES trend_analysis_runs(id) ON DELETE CASCADE,
    match_id BIGINT NOT NULL REFERENCES trend_product_matches(id) ON DELETE CASCADE,
    language_code TEXT NOT NULL, -- vi (베트남), th (태국), ko (한국어 번역)
    headline TEXT, -- 눈길을 사로잡는 헤드라인
    popularity_proof TEXT, -- 한국 내 인기 증거
    key_reasons TEXT[], -- 추천 이유 3가지
    is_authentic_guarantee BOOLEAN DEFAULT true, -- 한국 직배송 정품 강조 여부
    content_body TEXT, -- 전체 가공된 홍보 문구
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_contents_match_id ON marketing_contents(match_id);
COMMENT ON TABLE marketing_contents IS '3단계 AI 생성 국가별 홍보 문구';

-- 5. RLS 정책 설정 (기본적으로 관리자/본인만 접근 가능하도록)
ALTER TABLE trend_analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_product_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_contents ENABLE ROW LEVEL SECURITY;

-- 일단 인증된 모든 사용자가 본인의 데이터를 볼 수 있도록 설정 (필요시 강화)
CREATE POLICY "Users can manage own trend runs" ON trend_analysis_runs
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view associated extracted_trends" ON extracted_trends
    FOR SELECT USING (EXISTS (SELECT 1 FROM trend_analysis_runs WHERE id = run_id AND user_id = auth.uid()));

CREATE POLICY "Users can view associated product_matches" ON trend_product_matches
    FOR SELECT USING (EXISTS (SELECT 1 FROM trend_analysis_runs WHERE id = run_id AND user_id = auth.uid()));

CREATE POLICY "Users can view associated marketing_contents" ON marketing_contents
    FOR SELECT USING (EXISTS (SELECT 1 FROM trend_analysis_runs WHERE id = run_id AND user_id = auth.uid()));
