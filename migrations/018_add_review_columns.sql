-- Add review columns to products_master
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS review_rating NUMERIC(3, 1) DEFAULT 0.0;

COMMENT ON COLUMN products_master.review_count IS '리뷰 수';
COMMENT ON COLUMN products_master.review_rating IS '리뷰 평점 (5.0 만점)';
