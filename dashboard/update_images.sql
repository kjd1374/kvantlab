-- 1. 'images' 스토리지 버킷 생성 (퍼블릭 접근 허용)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. 'images' 버킷의 다운로드/조회 전체 공개 정책 설정
CREATE POLICY "Public Read Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'images' );

-- 3. sourcing_requests 테이블에 image_urls 배열 컬럼 추가 (비어있을 경우 대비)
ALTER TABLE public.sourcing_requests 
ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';
