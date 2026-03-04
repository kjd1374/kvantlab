-- Create trend_keywords table
CREATE TABLE IF NOT EXISTS public.trend_keywords (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    keyword TEXT NOT NULL,
    type TEXT NOT NULL, -- 'emerging', 'issue', 'steady', etc.
    category TEXT,      -- 'beauty', 'fashion', etc.
    rank INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for trend_keywords
ALTER TABLE public.trend_keywords ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access to anyone
CREATE POLICY "Allow public read access on trend_keywords" ON public.trend_keywords
    FOR SELECT USING (true);

-- Create trend_brands table
CREATE TABLE IF NOT EXISTS public.trend_brands (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    brand_name TEXT NOT NULL,
    category TEXT,
    rank INTEGER,
    rank_change INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for trend_brands
ALTER TABLE public.trend_brands ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access to anyone
CREATE POLICY "Allow public read access on trend_brands" ON public.trend_brands
    FOR SELECT USING (true);

-- Add trend columns to products_master if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products_master' AND column_name = 'current_rank') THEN
        ALTER TABLE public.products_master ADD COLUMN current_rank INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products_master' AND column_name = 'rank_change') THEN
        ALTER TABLE public.products_master ADD COLUMN rank_change INTEGER;
    END IF;
END $$;
