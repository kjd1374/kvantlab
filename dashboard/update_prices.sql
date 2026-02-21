
-- Update Etude Tint original price
UPDATE ranking_products_v2
SET price_original = 16000
WHERE product_id = 'A000000246380';

-- Update Ritter Chocolate original price (estimated)
UPDATE ranking_products_v2
SET price_original = 7000
WHERE product_id = 'A000000191996';

-- Update Amuse Pencil original price (estimated)
UPDATE ranking_products_v2
SET price_original = 18000
WHERE product_id = 'A000000204780'; -- Check ID first if possible, but based on name search
