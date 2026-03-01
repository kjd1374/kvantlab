-- 019_create_user_notifications.sql
-- 사용자 알림 시스템을 위한 마이그레이션

-- 1. user_notifications 테이블 생성
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,        -- 'sourcing', 'search_request', 'price_drop', 'rank_up'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,                         -- 프론트엔드 라우팅용 ('sourcing', 'admin' 등)
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 인덱스 추가 (조회 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id 
    ON public.user_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_user_notifications_unread 
    ON public.user_notifications(user_id, is_read) 
    WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at 
    ON public.user_notifications(created_at DESC);

-- 3. RLS 정책 (Row Level Security)
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- 서비스 롤은 모든 작업 가능 (서버 사이드에서 insert)
CREATE POLICY "Service role can manage all notifications"
    ON public.user_notifications
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 사용자는 자신의 알림만 조회 가능
CREATE POLICY "Users can read own notifications"
    ON public.user_notifications
    FOR SELECT
    USING (auth.uid() = user_id);

-- 사용자는 자신의 알림만 읽음 처리 가능
CREATE POLICY "Users can update own notifications"
    ON public.user_notifications
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
