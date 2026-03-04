-- Create steady_sellers table
CREATE TABLE IF NOT EXISTS public.steady_sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT NOT NULL,
    brand TEXT NOT NULL,
    price INTEGER DEFAULT 0,
    image_url TEXT,
    link TEXT,
    rank INTEGER DEFAULT 999,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Enable
ALTER TABLE public.steady_sellers ENABLE ROW LEVEL SECURITY;

-- Select policy: Anyone can read active steady sellers
CREATE POLICY "Public can view active steady sellers" ON public.steady_sellers FOR SELECT USING (is_active = true);

-- Insert/Update/Delete policy: Only admins can manage steady sellers
CREATE POLICY "Admins can manage steady sellers" ON public.steady_sellers 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
);
