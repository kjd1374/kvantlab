-- 007_setup_vector_search.sql
-- AI 기반 시맨틱 검색을 위한 벡터 검색 엔진 설정

-- 1. pgvector 익스텐션 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. products_master 테이블에 임베딩 컬럼 추가
-- Gemini embedding 모델(text-embedding-004)은 768 차원을 사용합니다.
ALTER TABLE public.products_master 
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- 3. 상품 검색을 위한 RPC (Remote Procedure Call) 생성
-- 코사인 유사도(Cosine Similarity)를 사용하여 가장 유사한 상품을 반환합니다.
CREATE OR REPLACE FUNCTION match_products (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  name text,
  brand text,
  price bigint,
  image_url text,
  product_url text,
  vi_name text,
  ai_summary jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pm.id,
    pm.name,
    pm.brand,
    pm.price,
    pm.image_url,
    pm.url as product_url,
    pm.vi_name,
    pm.ai_summary,
    1 - (pm.embedding <=> query_embedding) AS similarity
  FROM public.products_master pm
  WHERE 1 - (pm.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- 4. 검색 성능을 위한 인덱스 생성 (HNSW 인덱스)
CREATE INDEX IF NOT EXISTS idx_products_embedding ON public.products_master 
USING hnsw (embedding vector_cosine_ops);

COMMENT ON FUNCTION match_products IS '벡터 유사도 기반 상품 검색 함수 (AI 스마트 검색용)';
