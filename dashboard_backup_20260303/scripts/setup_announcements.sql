-- Create board_announcements table
CREATE TABLE IF NOT EXISTS public.board_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'notice', -- notice, report, update
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Enable
ALTER TABLE public.board_announcements ENABLE ROW LEVEL SECURITY;

-- Select policy: Anyone can read published announcements
CREATE POLICY "Public can view published announcements" ON public.board_announcements FOR SELECT USING (is_published = true);

-- Insert/Update/Delete policy: Only admins can manage announcements
CREATE POLICY "Admins can manage announcements" ON public.board_announcements 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
);
