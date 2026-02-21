-- 005_create_notifications.sql
-- 알림 시스템 구축을 위한 마이그레이션 스크립트

-- 1. 알림 테이블 생성
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL, -- 'price_drop', 'rank_up'
    product_id BIGINT REFERENCES public.products_master(id),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 추가 (조회 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read) WHERE is_read = FALSE;

-- 2. 가격 하락 알림 트리거 함수
CREATE OR REPLACE FUNCTION public.fn_on_price_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 가격이 5% 이상 하락했을 때만 알림 생성
    IF (OLD.price IS NOT NULL AND NEW.price < OLD.price * 0.95) THEN
        INSERT INTO public.notifications (type, product_id, message)
        VALUES (
            'price_drop',
            NEW.id,
            '[' || NEW.brand || '] ' || NEW.name || '의 가격이 ' || 
            to_char(OLD.price, '999,999,999') || '원에서 ' || 
            to_char(NEW.price, '999,999,999') || '원으로 하락했습니다!'
        );
    END IF;
    RETURN NEW;
END;
$$;

-- 트리거 등록
DROP TRIGGER IF EXISTS tr_on_price_change ON public.products_master;
CREATE TRIGGER tr_on_price_change
    AFTER UPDATE OF price ON public.products_master
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_on_price_change();

-- 3. 랭킹 급상승 알림 트리거 함수 (daily_rankings_v2 기준)
CREATE OR REPLACE FUNCTION public.fn_on_rank_jump()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    prev_rank INTEGER;
    p_name TEXT;
    p_brand TEXT;
BEGIN
    -- 이전 날짜의 순위 가져오기
    SELECT rank INTO prev_rank
    FROM public.daily_rankings_v2
    WHERE product_id = NEW.product_id
      AND category_code = NEW.category_code
      AND date < NEW.date
    ORDER BY date DESC
    LIMIT 1;

    -- 순위가 10단계 이상 대폭 상승했을 때 알림 생성
    IF (prev_rank IS NOT NULL AND (prev_rank - NEW.rank) >= 10) THEN
        -- 상품명 조회
        SELECT name, brand INTO p_name, p_brand
        FROM public.products_master
        WHERE id = NEW.product_id;

        INSERT INTO public.notifications (type, product_id, message)
        VALUES (
            'rank_up',
            NEW.product_id,
            '[' || COALESCE(p_brand, '알수없음') || '] ' || COALESCE(p_name, '상품') || '의 순위가 ' || 
            prev_rank || '위에서 ' || NEW.rank || '위로 급상승했습니다!'
        );
    END IF;
    RETURN NEW;
END;
$$;

-- 트리거 등록
DROP TRIGGER IF EXISTS tr_on_rank_jump ON public.daily_rankings_v2;
CREATE TRIGGER tr_on_rank_jump
    AFTER INSERT ON public.daily_rankings_v2
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_on_rank_jump();
