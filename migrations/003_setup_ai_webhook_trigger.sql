-- AI 분석 자동화 트리거 설정 (Supabase SQL Editor에서 실행)

-- 1. pg_net 익스텐션 활성화 (HTTP 요청용)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. 트리거 함수 생성
CREATE OR REPLACE FUNCTION public.trigger_analyze_new_product()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Supabase Edge Function 호출
  -- URL과 Service Role Key는 환경에 맞춰 자동으로 주입됩니다.
  PERFORM
    net.http_post(
      url := 'https://hgxblbbjlnsfkffwvfao.supabase.co/functions/v1/analyze-reviews',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8'
      ),
      body := jsonb_build_object(
        'productId', NEW.id,
        'productName', NEW.name,
        'persist', true
      )
    );
  RETURN NEW;
END;
$$;

-- 3. 트리거 등록 (상품 등록 시 실행)
DROP TRIGGER IF EXISTS tr_analyze_new_product ON public.products_master;
CREATE TRIGGER tr_analyze_new_product
AFTER INSERT ON public.products_master
FOR EACH ROW
EXECUTE FUNCTION public.trigger_analyze_new_product();

COMMENT ON TRIGGER tr_analyze_new_product ON public.products_master IS '신규 상품 등록 시 AI 리뷰 분석 Edge Function 자동 호출';
