-- =====================================================
-- Phase 8: 무신사 카테고리 데이터 시딩 (Musinsa Categories)
-- 실행 대상: Supabase SQL Editor
-- =====================================================

-- 1. 무신사 카테고리 데이터 삽입 (platform = 'musinsa')
-- 상위 카테고리 (Depth 1)
INSERT INTO categories (platform, category_code, name_ko, name_en, depth, sort_order) VALUES
('musinsa', '001', '상의', 'Top', 1, 1),
('musinsa', '002', '아우터', 'Outer', 1, 2),
('musinsa', '003', '바지', 'Pants', 1, 3),
('musinsa', '020', '원피스', 'One-piece', 1, 4),
('musinsa', '022', '스커트', 'Skirt', 1, 5),
('musinsa', '005', '신발', 'Shoes', 1, 6),
('musinsa', '004', '가방', 'Bag', 1, 7),
('musinsa', '007', '모자', 'Headwear', 1, 8),
('musinsa', '011', '액세서리', 'Accessory', 1, 9),
('musinsa', 'beauty', '뷰티', 'Beauty', 1, 10)
ON CONFLICT (platform, category_code) DO NOTHING;

-- 2. 상세 카테고리 (Depth 2 예시) - 필요 시 추가
-- 상의 하위
INSERT INTO categories (platform, category_code, name_ko, name_en, parent_code, depth, sort_order) VALUES
('musinsa', '001001', '반소매 티셔츠', 'Short Sleeve', '001', 2, 1),
('musinsa', '001002', '셔츠/블라우스', 'Shirt/Blouse', '001', 2, 2),
('musinsa', '001003', '피케/카라 티셔츠', 'Pique/Collar', '001', 2, 3),
('musinsa', '001004', '후드 티셔츠', 'Hoodie', '001', 2, 4),
('musinsa', '001005', '맨투맨/스웨트셔츠', 'Sweatshirt', '001', 2, 5),
('musinsa', '001006', '니트/스웨터', 'Knit/Sweater', '001', 2, 6)
ON CONFLICT (platform, category_code) DO NOTHING;

-- 아우터 하위
INSERT INTO categories (platform, category_code, name_ko, name_en, parent_code, depth, sort_order) VALUES
('musinsa', '002001', '블루종/MA-1', 'Blouson/MA-1', '002', 2, 1),
('musinsa', '002002', '레더/라이더스 재킷', 'Leather/Riders', '002', 2, 2),
('musinsa', '002003', '트럭커 재킷', 'Trucker', '002', 2, 3),
('musinsa', '002004', '슈트/블레이저 재킷', 'Suit/Blazer', '002', 2, 4),
('musinsa', '002006', '겨울 싱글 코트', 'Winter Single Coat', '002', 2, 6),
('musinsa', '002012', '숏패딩/숏헤비 아우터', 'Short Puffer', '002', 2, 12),
('musinsa', '002013', '롱패딩/롱헤비 아우터', 'Long Puffer', '002', 2, 13)
ON CONFLICT (platform, category_code) DO NOTHING;
